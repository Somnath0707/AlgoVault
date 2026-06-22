package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
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

    @Cacheable(value = "mastery", key = "#userId")
    public List<TagMastery> getMastery(Long userId) {
        return tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
    }

    @Transactional
    public void computeMastery(Long userId) {
        log.info("Computing Tag Mastery for user {}", userId);
        User user = userRepository.findById(userId).orElseThrow();
        List<Submission> allSubmissions = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);

        Map<String, List<Submission>> tagToSubmissions = new HashMap<>();
        for (Submission sub : allSubmissions) {
            if (sub.getProblem() != null && sub.getProblem().getTags() != null) {
                for (String tag : sub.getProblem().getTags()) {
                    tagToSubmissions.computeIfAbsent(tag, k -> new ArrayList<>()).add(sub);
                }
            }
        }

        List<TagMastery> updatedMasteries = new ArrayList<>();

        for (Map.Entry<String, List<Submission>> entry : tagToSubmissions.entrySet()) {
            String tag = entry.getKey();
            List<Submission> subs = entry.getValue();

            Collections.reverse(subs);

            Set<Long> attemptedProblems = new HashSet<>();
            Set<Long> solvedProblems = new HashSet<>();
            int firstAcCount = 0;
            LocalDateTime lastSolvedAt = null;

            Map<Long, Boolean> firstAttemptResult = new HashMap<>();

            for (Submission sub : subs) {
                Long probId = sub.getProblem().getId();
                attemptedProblems.add(probId);
                
                boolean isAc = "Accepted".equals(sub.getVerdict());
                
                if (!firstAttemptResult.containsKey(probId)) {
                    firstAttemptResult.put(probId, isAc);
                    if (isAc) firstAcCount++;
                }

                if (isAc) {
                    solvedProblems.add(probId);
                    if (lastSolvedAt == null || sub.getSubmittedAt().isAfter(lastSolvedAt)) {
                        lastSolvedAt = sub.getSubmittedAt();
                    }
                }
            }

            int totalAttempted = attemptedProblems.size();
            int totalSolved = solvedProblems.size();
            double successRate = totalAttempted > 0 ? (double) totalSolved / totalAttempted : 0.0;
            
            double volumeScore = Math.min(totalSolved / 50.0, 1.0);
            double speedScore = 0.5;
            double recencyScore = 0.5;
            if (lastSolvedAt != null) {
                long daysSince = java.time.Duration.between(lastSolvedAt, LocalDateTime.now()).toDays();
                recencyScore = Math.max(0, 1.0 - (daysSince / 100.0));
            }
            double contestScore = 0.5;

            double masteryScore = (0.35 * successRate) + (0.20 * volumeScore) + 
                                 (0.15 * speedScore) + (0.15 * recencyScore) + 
                                 (0.15 * contestScore);

            TagMastery tm = tagMasteryRepository.findByUserIdAndTag(userId, tag)
                .orElse(TagMastery.builder().user(user).tag(tag).build());

            tm.setTotalAttempted(totalAttempted);
            tm.setTotalSolved(totalSolved);
            tm.setFirstAcCount(firstAcCount);
            tm.setSuccessRate(successRate * 100.0);
            tm.setMasteryScore(masteryScore * 100.0);
            tm.setLastSolvedAt(lastSolvedAt);

            updatedMasteries.add(tm);
        }

        tagMasteryRepository.saveAll(updatedMasteries);
    }
}
