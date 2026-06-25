package com.algovault.engine;

import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.dto.PredictionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Component
@RequiredArgsConstructor
public class SolveProbabilityEngine {

    private final SimilarityEngine similarityEngine;

    public PredictionResponse predict(User user, Problem problem, List<Submission> submissions, List<TagMastery> masteries, List<com.algovault.model.ContestResult> contestResults, List<com.algovault.model.ProblemOpenEvent> openEvents) {
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
        double tagMastery = 0.5;
        if (problem.getTags() != null && !problem.getTags().isEmpty() && !masteries.isEmpty()) {
            double sumProbability = 0;
            int count = 0;
            for (String tag : problem.getTags()) {
                for (TagMastery tm : masteries) {
                    if (tm.getTag().equals(tag) && tm.getMasteryScore() != null) {
                        sumProbability += sigmoid((tm.getMasteryScore() - problemRating) / 200.0);
                        count++;
                        break;
                    }
                }
            }
            if (count > 0) {
                tagMastery = sumProbability / count;
            }
        }

        // 3. Rating Bucket History (Weight: 0.15)
        double ratingBucketHistory = 0.5;
        int bucketAcCount = 0;
        int bucketAttemptCount = 0;

        Map<String, Double> slugToRating = new HashMap<>();
        Map<Long, List<Submission>> bucketAttempts = new HashMap<>();
        for (Submission sub : submissions) {
            if (sub.getProblem() != null && sub.getProblem().getActualRating() != null) {
                double pr = sub.getProblem().getActualRating();
                slugToRating.put(sub.getProblem().getTitleSlug(), pr);
                if (Math.abs(pr - problemRating) <= 100) {
                    bucketAttempts.computeIfAbsent(sub.getProblem().getId(), ignored -> new java.util.ArrayList<>()).add(sub);
                }
            }
        }
        bucketAttemptCount = bucketAttempts.size();
        bucketAcCount = (int) bucketAttempts.values().stream()
            .filter(problemAttempts -> problemAttempts.stream().anyMatch(sub -> "Accepted".equals(sub.getVerdict())))
            .count();
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
        double contestPerformance = ratingBucketHistory;
        int contestBucketAttempted = 0;
        int contestBucketAC = 0;

        if (contestResults != null) {
            for (com.algovault.model.ContestResult cr : contestResults) {
                if (cr.getQuestionDetails() != null && cr.getQuestionDetails().containsKey("submissions")) {
                    Object subsObj = cr.getQuestionDetails().get("submissions");
                    if (subsObj instanceof List) {
                        List<?> cSubs = (List<?>) subsObj;
                        for (Object item : cSubs) {
                            if (item instanceof Map) {
                                Map<?, ?> subMap = (Map<?, ?>) item;
                                Object slugObj = subMap.get("titleSlug");
                                Object verdictObj = subMap.get("verdict");
                                if (slugObj instanceof String && verdictObj instanceof String) {
                                    String slug = (String) slugObj;
                                    String verdict = (String) verdictObj;
                                    Double rating = slugToRating.get(slug);
                                    if (rating != null && Math.abs(rating - problemRating) <= 100) {
                                        contestBucketAttempted++;
                                        if ("Accepted".equals(verdict)) {
                                            contestBucketAC++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (contestBucketAttempted > 0) {
            contestPerformance = (double) contestBucketAC / contestBucketAttempted;
        }

        // 6. Similar Solved Ratio (Weight: 0.15)
        double similarSolvedRatio = 0.5;
        long similarSolvedCount = 0;
        List<Problem> allProblems = submissions.stream().map(Submission::getProblem).distinct().collect(java.util.stream.Collectors.toList());
        List<Problem> similarProblems = similarityEngine.findSimilar(problem, allProblems, 20);
        if (!similarProblems.isEmpty()) {
            similarSolvedCount = submissions.stream()
                .filter(s -> "Accepted".equals(s.getVerdict()))
                .filter(s -> similarProblems.contains(s.getProblem()))
                .map(s -> s.getProblem().getId())
                .distinct()
                .count();
            similarSolvedRatio = (double) similarSolvedCount / similarProblems.size();
        }

        // Calculate final score
        double score = 0.25 * difficultyProximity +
                       0.20 * tagMastery +
                       0.15 * ratingBucketHistory +
                       0.15 * recentForm +
                       0.10 * contestPerformance +
                       0.15 * similarSolvedRatio;

        int solveChance = (int) Math.round(Math.max(0.0, Math.min(1.0, score)) * 100);

        // Expected Time
        int expectedTime = 20;
        if (bucketAcCount > 0) {
            expectedTime = (int) Math.max(5, 20 + ((problemRating - userCeiling) / 100.0) * 10);
        }

        // Focus score penalty
        double avgFocusScore = 100.0;
        int focusEventCount = 0;
        double sumFocusScore = 0;

        if (openEvents != null) {
            for (com.algovault.model.ProblemOpenEvent oe : openEvents) {
                if (oe.getProblem() != null && oe.getProblem().getActualRating() != null) {
                    if (Math.abs(oe.getProblem().getActualRating() - problemRating) <= 100) {
                        if (oe.getFocusScore() != null) {
                            sumFocusScore += oe.getFocusScore();
                            focusEventCount++;
                        }
                    }
                }
            }
        }

        if (focusEventCount > 0) {
            avgFocusScore = sumFocusScore / focusEventCount;
        }

        if (avgFocusScore < 50) {
            double penaltyPercent = ((50 - avgFocusScore) / 50.0) * 15.0; // up to 15
            solveChance = (int) Math.max(0, Math.round(solveChance - penaltyPercent));
        }

        String confidence = bucketAttemptCount >= 20 ? "HIGH" : (bucketAttemptCount >= 8 ? "MEDIUM" : "LOW");

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("difficultyProximity", difficultyProximity);
        breakdown.put("tagMastery", tagMastery);
        breakdown.put("ratingBucketHistory", ratingBucketHistory);
        breakdown.put("recentForm", recentForm);
        breakdown.put("contestPerformance", contestPerformance);
        breakdown.put("similarSolvedCount", similarSolvedCount);
        breakdown.put("tagStrengthPercent", tagMastery * 100.0);
        breakdown.put("ratingBucketSuccessPercent", ratingBucketHistory * 100.0);
        breakdown.put("sampleSize", bucketAttemptCount);

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
