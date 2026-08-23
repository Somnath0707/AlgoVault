package com.algovault.service;

import com.algovault.engine.Glicko2MasteryEngine.GlickoRating;
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
    private final MasteryService masteryService;

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

        // Delegate canonical Glicko-2 rating calculation to MasteryService
        MasteryService.TagRatingResult result = masteryService.computeTagRating(user, attempts, latestEventMap);
        GlickoRating gRating = result.finalRating();
        if (gRating == null) return;

        TopicRating tr = topicRatingRepository.findByUserIdAndTag(user.getId(), tag)
                .orElseGet(() -> TopicRating.builder().user(user).tag(tag).build());

        int finalRating = (int) Math.round(gRating.rating);
        tr.setEloRating(finalRating);
        tr.setRd(gRating.rd);
        tr.setVolatility(gRating.volatility);
        int conservative = Math.max(800, (int) Math.round(gRating.rating - 1.96 * gRating.rd));
        tr.setConservativeRating(conservative);

        Integer prevPeak = tr.getPeakRating();
        tr.setPeakRating(prevPeak == null ? finalRating : Math.max(prevPeak, finalRating));
        tr.setProblemsPlayed(result.totalAttempted());
        tr.setLastPracticedAt(result.lastSolvedAt());

        topicRatingRepository.save(tr);
    }

    private Map<Long, ProblemOpenEvent> buildLatestEventMap(Long userId) {
        Map<Long, ProblemOpenEvent> latestEventMap = new HashMap<>();
        for (ProblemOpenEvent e : problemOpenEventRepository.findByUserId(userId)) {
            if (e.getProblem() == null || e.getProblem().getId() == null) continue;
            Long pId = e.getProblem().getId();
            ProblemOpenEvent prev = latestEventMap.get(pId);
            if (prev == null || (e.getOpenedAt() != null && prev.getOpenedAt() != null && e.getOpenedAt().isAfter(prev.getOpenedAt()))) {
                latestEventMap.put(pId, e);
            }
        }
        return latestEventMap;
    }
}
