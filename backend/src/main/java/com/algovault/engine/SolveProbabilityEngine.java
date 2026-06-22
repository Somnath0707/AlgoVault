package com.algovault.engine;

import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.dto.PredictionResponse;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Component
public class SolveProbabilityEngine {

    public PredictionResponse predict(User user, Problem problem, List<Submission> submissions, List<TagMastery> masteries) {
        if (problem.getActualRating() == null) {
            return PredictionResponse.builder()
                .solveChance(50)
                .expectedTimeMinutes(30)
                .confidence("LOW")
                .build();
        }

        double problemRating = problem.getActualRating();
        
        // Find user ceiling (rating where first-AC rate < 40%)
        // For MVP, we'll estimate ceiling from user's current rating
        double userCeiling = (user.getVirtualRating() != null) ? user.getVirtualRating() : 1500;

        // 1. Difficulty Proximity (Weight: 0.25)
        double difficultyProximity = sigmoid((userCeiling - problemRating) / 200.0);

        // 2. Tag Mastery (Weight: 0.20)
        double tagMastery = 0.5; // default
        if (problem.getTags() != null && !problem.getTags().isEmpty() && !masteries.isEmpty()) {
            double sumMastery = 0;
            int count = 0;
            for (String tag : problem.getTags()) {
                for (TagMastery tm : masteries) {
                    if (tm.getTag().equals(tag) && tm.getMasteryScore() != null) {
                        sumMastery += tm.getMasteryScore() / 100.0;
                        count++;
                    }
                }
            }
            if (count > 0) {
                tagMastery = sumMastery / count;
            }
        }

        // 3. Rating Bucket History (Weight: 0.15)
        double ratingBucketHistory = 0.5;
        int bucketAcCount = 0;
        int bucketAttemptCount = 0;
        
        for (Submission sub : submissions) {
            if (sub.getProblem() != null && sub.getProblem().getActualRating() != null) {
                double pr = sub.getProblem().getActualRating();
                if (Math.abs(pr - problemRating) <= 100) {
                    bucketAttemptCount++;
                    if ("Accepted".equals(sub.getVerdict())) {
                        bucketAcCount++;
                    }
                }
            }
        }
        if (bucketAttemptCount > 0) {
            ratingBucketHistory = (double) bucketAcCount / bucketAttemptCount;
        }

        // 4. Recent Form (Weight: 0.15)
        double recentForm = 0.5;
        if (!submissions.isEmpty()) {
            double ema = 0;
            double weightSum = 0;
            int limit = Math.min(20, submissions.size());
            for (int i = 0; i < limit; i++) {
                Submission sub = submissions.get(i);
                double val = "Accepted".equals(sub.getVerdict()) ? 1.0 : 0.0;
                double weight = Math.pow(0.9, i);
                ema += val * weight;
                weightSum += weight;
            }
            recentForm = ema / weightSum;
        }

        // 5. Contest Performance (Weight: 0.10)
        double contestPerformance = ratingBucketHistory; // simplify for now

        // 6. Similar Solved Ratio (Weight: 0.15)
        double similarSolvedRatio = 0.5; // placeholder, would use SimilarityEngine

        // Calculate final score
        double score = 0.25 * difficultyProximity +
                       0.20 * tagMastery +
                       0.15 * ratingBucketHistory +
                       0.15 * recentForm +
                       0.10 * contestPerformance +
                       0.15 * similarSolvedRatio;

        int solveChance = (int) Math.round(score * 100);
        int expectedTime = 20; // Default minutes, would calculate from bucket
        String confidence = bucketAttemptCount >= 20 ? "HIGH" : (bucketAttemptCount >= 8 ? "MEDIUM" : "LOW");

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("difficultyProximity", difficultyProximity);
        breakdown.put("tagMastery", tagMastery);
        breakdown.put("ratingBucketHistory", ratingBucketHistory);
        breakdown.put("recentForm", recentForm);

        return PredictionResponse.builder()
                .solveChance(solveChance)
                .expectedTimeMinutes(expectedTime)
                .confidence(confidence)
                .breakdown(breakdown)
                .build();
    }

    private double sigmoid(double x) {
        return 1 / (1 + Math.exp(-x));
    }
}
