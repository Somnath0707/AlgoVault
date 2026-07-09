package com.algovault.service;
import com.algovault.engine.EloEngine;
import com.algovault.model.Submission;
import com.algovault.model.TopicRating;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TopicRatingRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
@Slf4j
public class TopicRatingService {
    private final SubmissionRepository submissionRepository;
    private final TopicRatingRepository topicRatingRepository;
    private final UserRepository userRepository;
    private final EloEngine eloEngine;

    @Transactional
    public void recomputeElo(Long userId) {
        log.info("Recomputing Topic Elo for user {}", userId);
        User user = userRepository.findById(userId).orElseThrow();
        
        // Fetch chronologically to simulate Elo sequence
        List<Submission> allSubs = submissionRepository.findByUserId(userId);
        allSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        Map<String, TopicRating> tagRatings = new HashMap<>();

        // Group into problem attempts
        Map<Long, List<Submission>> problemAttempts = new HashMap<>();
        for (Submission sub : allSubs) {
            problemAttempts.computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>()).add(sub);
        }

        for (Map.Entry<Long, List<Submission>> entry : problemAttempts.entrySet()) {
            List<Submission> subs = entry.getValue();
            if (subs.isEmpty() || subs.get(0).getProblem().getActualRating() == null) continue;
            
            int problemRating = (int) Math.round(subs.get(0).getProblem().getActualRating());
            List<String> tags = subs.get(0).getProblem().getTags();
            if (tags == null) continue;

            boolean isFirstTryAc = "Accepted".equals(subs.get(0).getVerdict());
            boolean isEventualAc = subs.stream().anyMatch(s -> "Accepted".equals(s.getVerdict()));
            
            double score = isFirstTryAc ? 1.0 : (isEventualAc ? 0.7 : 0.0);

            for (String tag : tags) {
                TopicRating tr = tagRatings.computeIfAbsent(tag, k -> 
                    TopicRating.builder().user(user).tag(k).eloRating(1200).peakRating(1200).problemsPlayed(0).build()
                );

                Integer currentElo = tr.getEloRating() != null ? tr.getEloRating() : 1200;
                Integer currentPlayed = tr.getProblemsPlayed() != null ? tr.getProblemsPlayed() : 0;
                int newElo = eloEngine.calculateNewElo(currentElo, problemRating, score, currentPlayed);
                tr.setEloRating(newElo);
                Integer peak = tr.getPeakRating() != null ? tr.getPeakRating() : 1200;
                if (newElo > peak) tr.setPeakRating(newElo);
                tr.setProblemsPlayed(currentPlayed + 1);
            }
        }

        // We only save if there's an actual update. In a real scenario we might delete old and insert new.
        // For now, we update the existing DB records.
        List<TopicRating> existing = topicRatingRepository.findByUserId(userId);
        for (TopicRating ex : existing) {
            TopicRating computed = tagRatings.get(ex.getTag());
            if (computed != null) {
                ex.setEloRating(computed.getEloRating());
                ex.setPeakRating(computed.getPeakRating());
                ex.setProblemsPlayed(computed.getProblemsPlayed());
                tagRatings.remove(ex.getTag()); // already handled
            }
        }
        
        // Save modifications to existing
        topicRatingRepository.saveAll(existing);
        // Save completely new topics
        topicRatingRepository.saveAll(new ArrayList<>(tagRatings.values()));
    }

    @Transactional
    public void updateIncremental(Long userId, Submission submission) {
        if (submission.getProblem() == null || submission.getProblem().getActualRating() == null) return;
        List<String> tags = submission.getProblem().getTags();
        if (tags == null || tags.isEmpty()) return;

        User user = userRepository.findById(userId).orElseThrow();
        for (String tag : tags) {
            recomputeEloForTag(user, tag);
        }
    }

    @Transactional
    public void recomputeEloForTag(User user, String tag) {
        List<Submission> tagSubs = submissionRepository.findByUserIdAndTag(user.getId(), tag);
        tagSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        Map<Long, List<Submission>> problemAttemptsMap = new LinkedHashMap<>();
        for (Submission sub : tagSubs) {
            if (sub.getProblem() != null && sub.getProblem().getActualRating() != null) {
                problemAttemptsMap.computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>()).add(sub);
            }
        }

        TopicRating tr = topicRatingRepository.findByUserIdAndTag(user.getId(), tag)
            .orElseGet(() -> TopicRating.builder().user(user).tag(tag).eloRating(1200).peakRating(1200).problemsPlayed(0).build());

        tr.setEloRating(1200);
        tr.setPeakRating(1200);
        tr.setProblemsPlayed(0);

        for (List<Submission> subs : problemAttemptsMap.values()) {
            int problemRating = (int) Math.round(subs.get(0).getProblem().getActualRating());
            boolean isFirstTryAc = "Accepted".equals(subs.get(0).getVerdict());
            boolean isEventualAc = subs.stream().anyMatch(s -> "Accepted".equals(s.getVerdict()));
            double score = isFirstTryAc ? 1.0 : (isEventualAc ? 0.7 : 0.0);

            Integer currentElo = tr.getEloRating() != null ? tr.getEloRating() : 1200;
            Integer currentPlayed = tr.getProblemsPlayed() != null ? tr.getProblemsPlayed() : 0;
            int newElo = eloEngine.calculateNewElo(currentElo, problemRating, score, currentPlayed);
            tr.setEloRating(newElo);
            Integer peak = tr.getPeakRating() != null ? tr.getPeakRating() : 1200;
            if (newElo > peak) tr.setPeakRating(newElo);
            tr.setProblemsPlayed(currentPlayed + 1);
        }

        if (tr.getProblemsPlayed() == 0) {
            topicRatingRepository.delete(tr);
        } else {
            topicRatingRepository.save(tr);
        }
    }
}
