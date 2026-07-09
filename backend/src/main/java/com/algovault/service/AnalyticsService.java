package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.ProblemOpenEvent;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import com.algovault.engine.Glicko2MasteryEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional
public class AnalyticsService {
    private final MasteryService masteryService;
    private final TopicRatingService topicRatingService;
    private final HeatmapService heatmapService;
    private final com.algovault.repository.UserRepository userRepository;
    private final com.algovault.repository.SubmissionRepository submissionRepository;
    private final com.algovault.engine.Glicko2MasteryEngine glickoEngine;

    @org.springframework.cache.annotation.Caching(evict = {
        @org.springframework.cache.annotation.CacheEvict(value = "dashboard", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "heatmap", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "mastery", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "potd", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "contests", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "weakness", key = "#userId"),
        @org.springframework.cache.annotation.CacheEvict(value = "predictions", allEntries = true)
    })
    public void recomputeAll(Long userId) {
        log.info("Recomputing analytics for user ID: {}", userId);
        recomputeMastery(userId);
        recomputeTopicRatings(userId);
        recomputeRatingBuckets(userId);
        recomputeVirtualRating(userId);
        log.info("Analytics recomputation completed for user ID: {}", userId);
    }
    
    public void recomputeMastery(Long userId) {
        masteryService.computeMastery(userId);
    }
    
    public void recomputeTopicRatings(Long userId) {
        topicRatingService.recomputeElo(userId);
    }
    
    public void recomputeRatingBuckets(Long userId) {
        heatmapService.recomputeHeatmap(userId);
    }

    public void updateIncremental(Long userId, Submission submission) {
        log.info("Incremental update of analytics for user: {}, submission: {}", userId, submission.getId());
        masteryService.updateIncremental(userId, submission);
        topicRatingService.updateIncremental(userId, submission);
        heatmapService.updateIncremental(userId, submission);
        recomputeVirtualRating(userId);
    }

    public void updateIncremental(Long userId, ProblemOpenEvent event) {
        log.info("Incremental update of analytics for user: {}, event: {}", userId, event.getId());
        masteryService.updateIncremental(userId, event);
    }

    public void recomputeVirtualRating(Long userId) {
        com.algovault.model.User user = userRepository.findById(userId).orElseThrow();
        if (user.getLcRating() != null && user.getLcRating() > 0) {
            user.setVirtualRating(user.getLcRating());
            userRepository.save(user);
            return;
        }

        List<Submission> submissions = submissionRepository.findByUserId(userId);
        if (submissions.isEmpty()) {
            user.setVirtualRating(1500);
            userRepository.save(user);
            return;
        }

        // Group submissions by problem to analyze outcomes per unique problem
        Map<Long, List<Submission>> problemAttempts = new HashMap<>();
        for (Submission s : submissions) {
            if (s.getProblem() != null && s.getProblem().getActualRating() != null) {
                problemAttempts.computeIfAbsent(s.getProblem().getId(), k -> new ArrayList<>()).add(s);
            }
        }

        if (problemAttempts.size() < 10) {
            // Fallback for very small datasets: weighted average of solved problem ratings
            double solvedSum = 0;
            int solvedCount = 0;
            double maxRating = 0;
            for (Map.Entry<Long, List<Submission>> entry : problemAttempts.entrySet()) {
                boolean solved = entry.getValue().stream().anyMatch(s -> "Accepted".equals(s.getVerdict()));
                double rating = entry.getValue().get(0).getProblem().getActualRating();
                if (solved) {
                    solvedSum += rating;
                    solvedCount++;
                    if (rating > maxRating) {
                        maxRating = rating;
                    }
                }
            }
            if (solvedCount == 0) {
                user.setVirtualRating(1200);
            } else {
                double avg = solvedSum / solvedCount;
                // Blended estimate with max solved rating to reflect ceiling
                user.setVirtualRating((int) Math.round(0.8 * avg + 0.2 * maxRating));
            }
            userRepository.save(user);
            return;
        }

        // Prepare dataset for Sigmoid Fitting
        List<double[]> dataset = new ArrayList<>(); // each item: [normalizedRating, outcome]
        double maxSolvedRating = 0;
        double minAttemptedRating = Double.MAX_VALUE;
        int solvedCount = 0;

        for (Map.Entry<Long, List<Submission>> entry : problemAttempts.entrySet()) {
            List<Submission> subs = entry.getValue();
            double rating = subs.get(0).getProblem().getActualRating();
            minAttemptedRating = Math.min(minAttemptedRating, rating);

            // Sort submissions chronologically to count attempts before AC
            subs.sort(Comparator.comparing(Submission::getSubmittedAt));
            boolean solved = false;
            int attemptsBeforeAc = 0;
            for (Submission s : subs) {
                if ("Accepted".equals(s.getVerdict())) {
                    solved = true;
                    break;
                }
                attemptsBeforeAc++;
            }

            double outcome = 0.0;
            if (solved) {
                solvedCount++;
                maxSolvedRating = Math.max(maxSolvedRating, rating);
                if (attemptsBeforeAc == 0) outcome = 1.0;
                else if (attemptsBeforeAc == 1) outcome = 0.8;
                else if (attemptsBeforeAc == 2) outcome = 0.6;
                else outcome = 0.4;
            } else {
                outcome = 0.0;
            }

            // Calculate temporal weight based on 365-day half-life of concept retention
            LocalDateTime lastSubmissionTime = subs.stream()
                .map(Submission::getSubmittedAt)
                .max(Comparator.naturalOrder())
                .orElse(LocalDateTime.now());
            long daysAgo = java.time.Duration.between(lastSubmissionTime, LocalDateTime.now()).toDays();
            double weight = 1.0;
            if (daysAgo > 0) {
                weight = Math.exp(- (Math.log(2.0) / 365.0) * daysAgo);
            }
            weight = Math.max(0.10, weight); // minimum baseline weight of 10%

            // Normalize rating: (Rating - 1500) / 500
            double normRating = (rating - 1500.0) / 500.0;
            dataset.add(new double[]{normRating, outcome, weight});
        }

        double totalProblems = dataset.size();
        double solveRate = (double) solvedCount / totalProblems;

        if (solveRate > 0.95) {
            // Extreme boundary: user solved almost everything attempted
            user.setVirtualRating((int) Math.round(maxSolvedRating + 100));
        } else if (solveRate < 0.05) {
            // Extreme boundary: user failed almost everything attempted
            user.setVirtualRating((int) Math.max(800, Math.round(minAttemptedRating - 100)));
        } else {
            // Fit Logistic Regression: P(success) = 1 / (1 + e^-(theta0 - theta1 * x))
            double theta0 = 0.0;
            double theta1 = 1.0; // Positive coefficient (higher rating means lower probability of success)
            double alpha = 0.05; // Learning rate
            double lambda = 0.05; // L2 Regularization weight
            int iterations = 1000;

            for (int iter = 0; iter < iterations; iter++) {
                double grad0 = 0.0;
                double grad1 = 0.0;
                double sumWeights = 0.0;

                for (double[] point : dataset) {
                    double x = point[0];
                    double y = point[1];
                    double w = point[2];
                    double z = theta0 - theta1 * x;
                    double p = 1.0 / (1.0 + Math.exp(-z));

                    grad0 += w * (p - y);
                    grad1 += w * (p - y) * (-x);
                    sumWeights += w;
                }

                double avgGrad0 = grad0 / sumWeights;
                double avgGrad1 = (grad1 / sumWeights) + lambda * theta1; // Only regularize the slope

                theta0 -= alpha * avgGrad0;
                theta1 -= alpha * avgGrad1;

                // Project theta1 to be positive so probability strictly decreases with rating difficulty
                if (theta1 < 0.05) {
                    theta1 = 0.05;
                }
            }

            // Find rating where solve probability is exactly 50%: theta0 - theta1 * x = 0 => x = theta0 / theta1
            double targetNormRating = theta0 / theta1;
            double estimatedRating = targetNormRating * 500.0 + 1500.0;
            estimatedRating = Math.max(800.0, Math.min(3000.0, estimatedRating));

            // Chronological Glicko-2 Simulation
            List<Submission> allSubs = new ArrayList<>(submissions);
            allSubs.sort(Comparator.comparing(Submission::getSubmittedAt));

            Map<Long, List<Submission>> chronologicalAttempts = new LinkedHashMap<>();
            for (Submission s : allSubs) {
                if (s.getProblem() != null && s.getProblem().getActualRating() != null) {
                    chronologicalAttempts.computeIfAbsent(s.getProblem().getId(), k -> new ArrayList<>()).add(s);
                }
            }

            double startingRating = 1500.0;
            Glicko2MasteryEngine.GlickoRating userGlicko = new Glicko2MasteryEngine.GlickoRating(startingRating, 350.0, 0.06);

            for (List<Submission> problemAttemptsList : chronologicalAttempts.values()) {
                Submission first = problemAttemptsList.get(0);
                Submission accepted = problemAttemptsList.stream()
                    .filter(sub -> "Accepted".equals(sub.getVerdict()))
                    .findFirst()
                    .orElse(null);

                double score = 0.0;
                if (accepted != null) {
                    score = "Accepted".equals(first.getVerdict()) ? 1.0 : 0.7;
                }

                double opponentRating = first.getProblem().getActualRating();

                // Skip large rating bumps for problems far below user level
                if (opponentRating < userGlicko.rating - 300.0 && score > 0.0) {
                    userGlicko = glickoEngine.updateRating(userGlicko, Collections.emptyList());
                } else {
                    userGlicko = glickoEngine.updateRating(userGlicko, List.of(
                        new Glicko2MasteryEngine.MatchResult(opponentRating, 50.0, score)
                    ));
                }
            }

            double glickoRating = userGlicko.rating - (2.0 * userGlicko.rd);
            glickoRating = Math.max(800.0, Math.min(3000.0, glickoRating));

            // Blend Glicko-2 and Sigmoid Fit (50/50)
            double blendedRating = 0.5 * estimatedRating + 0.5 * glickoRating;
            user.setVirtualRating((int) Math.round(blendedRating));
        }

        userRepository.save(user);
    }
}
