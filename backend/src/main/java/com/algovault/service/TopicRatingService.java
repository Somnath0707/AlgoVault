package com.algovault.service;

import com.algovault.engine.Glicko2MasteryEngine;
import com.algovault.engine.Glicko2MasteryEngine.GlickoRating;
import com.algovault.engine.Glicko2MasteryEngine.MatchResult;
import com.algovault.model.ProblemOpenEvent;
import com.algovault.model.Submission;
import com.algovault.model.TopicRating;
import com.algovault.model.User;
import com.algovault.repository.ProblemOpenEventRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TopicRatingRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TopicRatingService {

    private final SubmissionRepository submissionRepository;
    private final TopicRatingRepository topicRatingRepository;
    private final UserRepository userRepository;
    private final ProblemOpenEventRepository problemOpenEventRepository;
    private final Glicko2MasteryEngine glickoEngine;

    @Transactional
    public void recomputeElo(Long userId) {
        log.info("Recomputing Glicko-2 Topic Ratings for user {}", userId);
        User user = userRepository.findById(userId).orElseThrow();

        List<Submission> allSubs = submissionRepository.findByUserId(userId);
        allSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        // Gather all distinct topic tags
        Set<String> allTags = new HashSet<>();
        for (Submission sub : allSubs) {
            if (sub.getProblem() != null && sub.getProblem().getTags() != null) {
                allTags.addAll(sub.getProblem().getTags());
            }
        }

        Map<Long, ProblemOpenEvent> latestEventMap = buildLatestEventMap(userId);
        for (String tag : allTags) {
            recomputeEloForTag(user, tag, latestEventMap);
        }
    }

    @Transactional
    public void updateIncremental(Long userId, Submission submission) {
        if (submission.getProblem() == null || submission.getProblem().getTags() == null) return;
        List<String> tags = submission.getProblem().getTags();
        if (tags.isEmpty()) return;

        User user = userRepository.findById(userId).orElseThrow();
        Map<Long, ProblemOpenEvent> latestEventMap = buildLatestEventMap(userId);
        for (String tag : tags) {
            recomputeEloForTag(user, tag, latestEventMap);
        }
    }

    @Transactional
    public void recomputeEloForTag(User user, String tag) {
        Map<Long, ProblemOpenEvent> latestEventMap = buildLatestEventMap(user.getId());
        recomputeEloForTag(user, tag, latestEventMap);
    }

    @Transactional
    public void recomputeEloForTag(User user, String tag, Map<Long, ProblemOpenEvent> latestEventMap) {
        List<Submission> rawTagSubs = submissionRepository.findByUserIdAndTag(user.getId(), tag);
        if (rawTagSubs == null || rawTagSubs.isEmpty()) return;

        List<Submission> tagSubs = new ArrayList<>(rawTagSubs);
        tagSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        Map<Long, List<Submission>> problemAttemptsMap = new LinkedHashMap<>();
        for (Submission sub : tagSubs) {
            if (sub.getProblem() != null) {
                problemAttemptsMap.computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>()).add(sub);
            }
        }

        List<List<Submission>> attempts = new ArrayList<>(problemAttemptsMap.values());
        attempts.forEach(list -> list.sort(Comparator.comparing(Submission::getSubmittedAt)));
        attempts.sort(Comparator.comparing(list -> list.get(0).getSubmittedAt()));

        GlickoRating gRating = new GlickoRating(1500.0, 350.0, 0.06);
        int problemsPlayed = 0;
        int maxRating = 1500;
        LocalDateTime lastPracticedAt = null;

        // Group matches by month of first submission
        TreeMap<YearMonth, List<MatchResult>> monthBatches = new TreeMap<>();

        for (List<Submission> subs : attempts) {
            if (subs.isEmpty()) continue;
            Submission firstSub = subs.get(0);
            Submission acceptedSub = subs.stream()
                .filter(s -> "Accepted".equals(s.getVerdict()))
                .findFirst()
                .orElse(null);

            double opponentRating = firstSub.getProblem().getActualRating() != null
                ? firstSub.getProblem().getActualRating()
                : MasteryService.inferRatingFromDifficulty(firstSub.getProblem().getDifficulty());

            double opponentRD = MasteryService.computeOpponentRD(firstSub.getProblem());

            ProblemOpenEvent event = latestEventMap != null ? latestEventMap.get(firstSub.getProblem().getId()) : null;
            double score = MasteryService.computeScore(firstSub, acceptedSub, event);

            YearMonth month = YearMonth.from(firstSub.getSubmittedAt());
            monthBatches.computeIfAbsent(month, k -> new ArrayList<>())
                .add(new MatchResult(opponentRating, opponentRD, score));

            problemsPlayed++;
            if (firstSub.getSubmittedAt() != null && (lastPracticedAt == null || firstSub.getSubmittedAt().isAfter(lastPracticedAt))) {
                lastPracticedAt = firstSub.getSubmittedAt();
            }
        }

        if (problemsPlayed == 0) return;

        // Process batches month-by-month with gap decay
        YearMonth prevMonth = null;
        for (Map.Entry<YearMonth, List<MatchResult>> batch : monthBatches.entrySet()) {
            YearMonth currentMonth = batch.getKey();

            if (prevMonth != null) {
                long gapMonths = prevMonth.until(currentMonth, java.time.temporal.ChronoUnit.MONTHS) - 1;
                if (gapMonths > 0) {
                    gRating = glickoEngine.applyTimeDecay(gRating, (int) Math.min(gapMonths, 6));
                }
            }

            gRating = glickoEngine.updateRating(gRating, batch.getValue());
            int currentRoundRating = (int) Math.round(gRating.rating);
            if (currentRoundRating > maxRating) {
                maxRating = currentRoundRating;
            }
            prevMonth = currentMonth;
        }

        // Apply trailing inactivity time decay
        if (lastPracticedAt != null) {
            long monthsSince = java.time.Duration.between(lastPracticedAt, LocalDateTime.now()).toDays() / 30;
            if (monthsSince > 0) {
                gRating = glickoEngine.applyTimeDecay(gRating, (int) Math.min(monthsSince, 6));
            }
        }

        TopicRating tr = topicRatingRepository.findByUserIdAndTag(user.getId(), tag)
                .orElseGet(() -> TopicRating.builder().user(user).tag(tag).build());

        int finalRating = (int) Math.round(gRating.rating);
        tr.setEloRating(finalRating);
        tr.setRd(gRating.rd);
        tr.setVolatility(gRating.volatility);
        int conservative = Math.max(800, (int) Math.round(gRating.rating - 1.96 * gRating.rd));
        tr.setConservativeRating(conservative);

        Integer prevPeak = tr.getPeakRating();
        tr.setPeakRating(prevPeak == null ? maxRating : Math.max(prevPeak, maxRating));
        tr.setProblemsPlayed(problemsPlayed);
        tr.setLastPracticedAt(lastPracticedAt);

        topicRatingRepository.save(tr);
    }

    private Map<Long, ProblemOpenEvent> buildLatestEventMap(Long userId) {
        Map<Long, ProblemOpenEvent> latestEventMap = new HashMap<>();
        for (ProblemOpenEvent e : problemOpenEventRepository.findByUserId(userId)) {
            if (e.getProblem() == null || e.getProblem().getId() == null) continue;
            Long pid = e.getProblem().getId();
            if (!latestEventMap.containsKey(pid)
                    || latestEventMap.get(pid).getOpenedAt().isBefore(e.getOpenedAt())) {
                latestEventMap.put(pid, e);
            }
        }
        return latestEventMap;
    }
}
