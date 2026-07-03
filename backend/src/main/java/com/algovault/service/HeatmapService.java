package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.UserRatingBucket;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.UserRatingBucketRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import org.springframework.cache.annotation.Cacheable;

@Service
@RequiredArgsConstructor
@Slf4j
public class HeatmapService {
    private final SubmissionRepository submissionRepository;
    private final UserRatingBucketRepository userRatingBucketRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "heatmap", key = "#userId")
    public List<UserRatingBucket> getHeatmap(Long userId) {
        List<UserRatingBucket> buckets = userRatingBucketRepository.findByUserId(userId);
        buckets.sort(Comparator.comparing(UserRatingBucket::getBucketRating));
        return buckets;
    }

    @Transactional
    public void recomputeHeatmap(Long userId) {
        log.info("Recomputing Heatmap for user {}", userId);
        User user = userRepository.findById(userId).orElseThrow();
        
        List<Submission> allSubs = submissionRepository.findByUserId(userId);
        allSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        // Group by bucket (increments of 100)
        Map<Integer, UserRatingBucket> buckets = new HashMap<>();

        Map<Long, List<Submission>> problemAttempts = new HashMap<>();
        for (Submission sub : allSubs) {
            problemAttempts.computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>()).add(sub);
        }

        for (Map.Entry<Long, List<Submission>> entry : problemAttempts.entrySet()) {
            List<Submission> subs = entry.getValue();
            if (subs.isEmpty() || subs.get(0).getProblem().getActualRating() == null) continue;
            subs.sort(Comparator.comparing(Submission::getSubmittedAt));
            
            int rating = (int) Math.round(subs.get(0).getProblem().getActualRating());
            int bucketRating = (rating / 100) * 100;

            UserRatingBucket bucket = buckets.computeIfAbsent(bucketRating, k -> 
                UserRatingBucket.builder().user(user).bucketRating(k).attempted(0).solved(0).firstAcCount(0).avgAttempts(0.0).avgSolveTime(0.0).build()
            );

            bucket.setAttempted(bucket.getAttempted() + 1);
            
            boolean isFirstTryAc = "Accepted".equals(subs.get(0).getVerdict());
            boolean isEventualAc = subs.stream().anyMatch(s -> "Accepted".equals(s.getVerdict()));
            
            if (isEventualAc) {
                bucket.setSolved(bucket.getSolved() + 1);
            }
            if (isFirstTryAc) {
                bucket.setFirstAcCount(bucket.getFirstAcCount() + 1);
            }

            int attemptsUntilAc = 0;
            for (Submission sub : subs) {
                attemptsUntilAc++;
                if ("Accepted".equals(sub.getVerdict())) {
                    break;
                }
            }
            bucket.setAvgAttempts(bucket.getAvgAttempts() + attemptsUntilAc);

            if (isEventualAc && subs.size() > 1) {
                long minutes = java.time.Duration.between(subs.get(0).getSubmittedAt(), subs.get(attemptsUntilAc - 1).getSubmittedAt()).toMinutes();
                bucket.setAvgSolveTime(bucket.getAvgSolveTime() + Math.max(0, minutes));
            }
        }

        for (UserRatingBucket bucket : buckets.values()) {
            if (bucket.getAttempted() != null && bucket.getAttempted() > 0) {
                bucket.setAvgAttempts(bucket.getAvgAttempts() / bucket.getAttempted());
            }
            if (bucket.getSolved() != null && bucket.getSolved() > 0) {
                bucket.setAvgSolveTime(bucket.getAvgSolveTime() / bucket.getSolved());
            } else {
                bucket.setAvgSolveTime(0.0);
            }
        }

        List<UserRatingBucket> existing = userRatingBucketRepository.findByUserId(userId);
        userRatingBucketRepository.deleteAll(existing);
        userRatingBucketRepository.flush();
        userRatingBucketRepository.saveAll(buckets.values());
    }

    @Transactional
    public void updateIncremental(Long userId, Submission submission) {
        if (submission.getProblem() == null || submission.getProblem().getActualRating() == null) return;
        
        User user = userRepository.findById(userId).orElseThrow();
        int rating = (int) Math.round(submission.getProblem().getActualRating());
        int bucketRating = (rating / 100) * 100;

        UserRatingBucket bucket = userRatingBucketRepository.findByUserId(userId).stream()
            .filter(b -> b.getBucketRating().equals(bucketRating))
            .findFirst()
            .orElseGet(() -> UserRatingBucket.builder()
                .user(user)
                .bucketRating(bucketRating)
                .attempted(0)
                .solved(0)
                .firstAcCount(0)
                .avgAttempts(0.0)
                .avgSolveTime(0.0)
                .build());

        List<Submission> problemSubs = submissionRepository.findByUserIdAndProblemId(userId, submission.getProblem().getId());
        problemSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

        if (problemSubs.size() == 1) {
            bucket.setAttempted(bucket.getAttempted() + 1);
            if ("Accepted".equals(submission.getVerdict())) {
                bucket.setSolved(bucket.getSolved() + 1);
                bucket.setFirstAcCount(bucket.getFirstAcCount() + 1);
            }
        } else {
            boolean wasSolved = problemSubs.subList(0, problemSubs.size() - 1).stream()
                .anyMatch(s -> "Accepted".equals(s.getVerdict()));
            boolean isSolvedNow = "Accepted".equals(submission.getVerdict());
            if (!wasSolved && isSolvedNow) {
                bucket.setSolved(bucket.getSolved() + 1);
            }
        }

        List<Submission> allSubs = submissionRepository.findByUserId(userId);
        List<Submission> bucketSubs = allSubs.stream()
            .filter(s -> s.getProblem() != null && s.getProblem().getActualRating() != null &&
                        ((int) Math.round(s.getProblem().getActualRating()) / 100) * 100 == bucketRating)
            .toList();

        Map<Long, List<Submission>> problemAttempts = new HashMap<>();
        for (Submission sub : bucketSubs) {
            problemAttempts.computeIfAbsent(sub.getProblem().getId(), k -> new ArrayList<>()).add(sub);
        }

        double totalAttempts = 0;
        double totalSolveTime = 0;
        int solvedCount = 0;

        for (List<Submission> subs : problemAttempts.values()) {
            subs.sort(Comparator.comparing(Submission::getSubmittedAt));
            boolean isEventualAc = subs.stream().anyMatch(s -> "Accepted".equals(s.getVerdict()));
            int attemptsUntilAc = 0;
            for (Submission sub : subs) {
                attemptsUntilAc++;
                if ("Accepted".equals(sub.getVerdict())) {
                    break;
                }
            }
            totalAttempts += attemptsUntilAc;
            if (isEventualAc) {
                solvedCount++;
                if (subs.size() > 1) {
                    long minutes = java.time.Duration.between(subs.get(0).getSubmittedAt(), subs.get(attemptsUntilAc - 1).getSubmittedAt()).toMinutes();
                    totalSolveTime += Math.max(0, minutes);
                }
            }
        }

        bucket.setAvgAttempts(problemAttempts.isEmpty() ? 0.0 : totalAttempts / problemAttempts.size());
        bucket.setAvgSolveTime(solvedCount == 0 ? 0.0 : totalSolveTime / solvedCount);
        
        userRatingBucketRepository.save(bucket);
    }
}
