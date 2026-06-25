package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.model.ProblemOpenEvent;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import com.algovault.engine.Glicko2MasteryEngine;
import com.algovault.repository.ProblemOpenEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MasteryService {
    private final SubmissionRepository submissionRepository;
    private final TagMasteryRepository tagMasteryRepository;
    private final UserRepository userRepository;
    private final ProblemOpenEventRepository problemOpenEventRepository;
    private final Glicko2MasteryEngine glickoEngine;

    @Cacheable(value = "mastery", key = "#userId")
    public List<TagMastery> getMastery(Long userId) {
        return tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
    }

    @Transactional
    public void computeMastery(Long userId) {
        log.info("Computing Tag Mastery for user {}", userId);
        User user = userRepository.findById(userId).orElseThrow();
        List<Submission> allSubmissions = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);

        Map<Long, ProblemOpenEvent> latestEventMap = new HashMap<>();
        for (ProblemOpenEvent e : problemOpenEventRepository.findByUserId(userId)) {
            Long pid = e.getProblem().getId();
            if (!latestEventMap.containsKey(pid) || latestEventMap.get(pid).getOpenedAt().isBefore(e.getOpenedAt())) {
                latestEventMap.put(pid, e);
            }
        }

        Map<String, Map<Long, List<Submission>>> tagToProblemAttempts = new HashMap<>();
        for (Submission sub : allSubmissions) {
            if (sub.getProblem() != null && sub.getProblem().getTags() != null) {
                for (String tag : sub.getProblem().getTags()) {
                    tagToProblemAttempts
                        .computeIfAbsent(tag, k -> new HashMap<>())
                        .computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>())
                        .add(sub);
                }
            }
        }

        List<TagMastery> updatedMasteries = new ArrayList<>();

        for (Map.Entry<String, Map<Long, List<Submission>>> entry : tagToProblemAttempts.entrySet()) {
            String tag = entry.getKey();
            List<List<Submission>> attempts = new ArrayList<>(entry.getValue().values());
            attempts.forEach(list -> list.sort(Comparator.comparing(Submission::getSubmittedAt)));
            attempts.sort(Comparator.comparing(list -> list.get(0).getSubmittedAt()));

            int firstAcCount = 0;
            int totalSolved = 0;
            LocalDateTime lastSolvedAt = null;
            double totalSolveMinutes = 0;
            int timedSolves = 0;

            double startingRating = (user.getLcRating() != null && user.getLcRating() > 0) ? user.getLcRating() : 1500.0;
            Glicko2MasteryEngine.GlickoRating currentRating = new Glicko2MasteryEngine.GlickoRating(startingRating, 350.0, 0.06);

            for (List<Submission> problemAttempts : attempts) {
                Submission first = problemAttempts.get(0);
                Submission accepted = problemAttempts.stream()
                    .filter(sub -> "Accepted".equals(sub.getVerdict()))
                    .findFirst()
                    .orElse(null);

                double score = 0.0;
                if (accepted != null) {
                    totalSolved++;
                    if ("Accepted".equals(first.getVerdict())) {
                        firstAcCount++;
                    }
                    if (lastSolvedAt == null || accepted.getSubmittedAt().isAfter(lastSolvedAt)) {
                        lastSolvedAt = accepted.getSubmittedAt();
                    }

                    score = "Accepted".equals(first.getVerdict()) ? 1.0 : 0.7;
                    ProblemOpenEvent event = latestEventMap.get(first.getProblem().getId());
                    if (event != null) {
                        String help = event.getSelfReportedHelp();
                        if ("EDITORIAL".equals(help) || "EXTERNAL".equals(help)) {
                            score = 0.0;
                        } else if ("HINT".equals(help) || (event.getFocusScore() != null && event.getFocusScore() < 50)) {
                            score = Math.min(score, 0.5);
                        }
                        if (event.getFocusSeconds() != null && event.getFocusSeconds() > 0) {
                            totalSolveMinutes += event.getFocusSeconds() / 60.0;
                            timedSolves++;
                        }
                    } else if (problemAttempts.size() > 1) {
                        long minutes = java.time.Duration.between(first.getSubmittedAt(), accepted.getSubmittedAt()).toMinutes();
                        totalSolveMinutes += Math.max(0, minutes);
                        timedSolves++;
                    }
                }

                double opponentRating = first.getProblem().getActualRating() != null
                    ? first.getProblem().getActualRating()
                    : 1500.0;
                currentRating = glickoEngine.updateRating(currentRating, List.of(
                    new Glicko2MasteryEngine.MatchResult(opponentRating, 50.0, score)
                ));
            }

            if (lastSolvedAt != null) {
                long monthsSince = java.time.Duration.between(lastSolvedAt, LocalDateTime.now()).toDays() / 30;
                for (int m = 0; m < monthsSince; m++) {
                    currentRating = glickoEngine.updateRating(currentRating, Collections.emptyList());
                }
            }

            int totalAttempted = attempts.size();
            double successRate = totalAttempted > 0 ? (double) totalSolved / totalAttempted : 0.0;

            TagMastery tm = tagMasteryRepository.findByUserIdAndTag(userId, tag)
                .orElse(TagMastery.builder().user(user).tag(tag).build());

            tm.setTotalAttempted(totalAttempted);
            tm.setTotalSolved(totalSolved);
            tm.setFirstAcCount(firstAcCount);
            tm.setSuccessRate(successRate * 100.0);
            tm.setAvgSolveTime(timedSolves > 0 ? totalSolveMinutes / timedSolves : null);
            double conservativeScore = currentRating.rating - (1.5 * currentRating.rd);
            tm.setMasteryScore(Math.max(800.0, conservativeScore));
            tm.setRd(currentRating.rd);
            tm.setVolatility(currentRating.volatility);
            tm.setLastSolvedAt(lastSolvedAt);

            updatedMasteries.add(tm);
        }

        Set<String> computedTags = updatedMasteries.stream().map(TagMastery::getTag).collect(java.util.stream.Collectors.toSet());
        List<TagMastery> stale = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId).stream()
            .filter(mastery -> !computedTags.contains(mastery.getTag()))
            .toList();
        tagMasteryRepository.deleteAll(stale);
        tagMasteryRepository.saveAll(updatedMasteries);
    }
}
