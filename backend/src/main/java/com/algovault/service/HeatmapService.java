package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.UserRatingBucket;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.UserRatingBucketRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

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
                bucket.setAvgSolveTime(bucket.getAvgSolveTime() / bucket.getAttempted());
            }
        }

        List<UserRatingBucket> existing = userRatingBucketRepository.findByUserId(userId);
        userRatingBucketRepository.deleteAll(existing);
        userRatingBucketRepository.flush();
        userRatingBucketRepository.saveAll(buckets.values());
    }
}
