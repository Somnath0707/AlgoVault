package com.algovault.engine;

import com.algovault.dto.PredictionResponse;
import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A conservative, explainable practice estimate.  It uses first attempts at
 * comparable ratings and Beta-binomial smoothing; it deliberately does not
 * blend overlapping ratings, tags, contest data, and focus telemetry as if
 * they were independent measurements.
 */
@Component
@RequiredArgsConstructor
public class SolveProbabilityEngine {

    private static final int COMPARABLE_RATING_WINDOW = 150;
    private static final double PRIOR_STRENGTH = 8.0;

    public PredictionResponse predict(
            User user,
            Problem problem,
            List<Submission> submissions,
            List<TagMastery> ignoredMasteries,
            List<com.algovault.model.ContestResult> ignoredContests,
            List<com.algovault.model.ProblemOpenEvent> openEvents) {
        if (problem.getActualRating() == null) {
            return response(50, 0, 0, 0.5, 0, "LOW", true, new HashMap<>());
        }

        double targetRating = problem.getActualRating();
        Map<Long, List<Submission>> attemptsByProblem = new LinkedHashMap<>();
        submissions.stream()
                .filter(submission -> submission.getProblem() != null)
                .filter(submission -> submission.getProblem().getId() != null)
                .filter(submission -> submission.getProblem().getActualRating() != null)
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(submission -> attemptsByProblem
                        .computeIfAbsent(submission.getProblem().getId(), ignored -> new ArrayList<>())
                        .add(submission));

        int observations = 0;
        int firstAttemptAccepted = 0;
        for (List<Submission> attempts : attemptsByProblem.values()) {
            Submission firstAttempt = attempts.get(0);
            if (Math.abs(firstAttempt.getProblem().getActualRating() - targetRating) > COMPARABLE_RATING_WINDOW) {
                continue;
            }
            observations++;
            if ("Accepted".equals(firstAttempt.getVerdict())) {
                firstAttemptAccepted++;
            }
        }

        // A weak Elo-style prior keeps estimates usable with little history.
        // It is always outvoted as comparable first-attempt evidence grows.
        double ratingPrior = user.getVirtualRating() == null
                ? 0.5
                : logistic((user.getVirtualRating() - targetRating) / 250.0);
        double probability = (PRIOR_STRENGTH * ratingPrior + firstAttemptAccepted)
                / (PRIOR_STRENGTH + observations);
        int chance = (int) Math.round(probability * 100.0);

        List<Integer> observedMinutes = new ArrayList<>();
        if (openEvents != null) {
            for (com.algovault.model.ProblemOpenEvent event : openEvents) {
                if (event.getProblem() == null || event.getProblem().getActualRating() == null || event.getFocusSeconds() == null) continue;
                if (Math.abs(event.getProblem().getActualRating() - targetRating) <= COMPARABLE_RATING_WINDOW && event.getFocusSeconds() > 0) {
                    observedMinutes.add(Math.max(1, Math.round(event.getFocusSeconds() / 60.0f)));
                }
            }
        }
        observedMinutes.sort(Integer::compareTo);
        int medianMinutes = observedMinutes.isEmpty() ? 0 : observedMinutes.get(observedMinutes.size() / 2);
        String confidence = observations >= 20 ? "HIGH" : observations >= 8 ? "MEDIUM" : "LOW";

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("method", "smoothed comparable first-attempt rate");
        breakdown.put("comparableRatingWindow", COMPARABLE_RATING_WINDOW);
        breakdown.put("firstAttemptAccepted", firstAttemptAccepted);
        breakdown.put("comparableProblems", observations);
        breakdown.put("ratingPriorPercent", Math.round(ratingPrior * 100.0));
        breakdown.put("observedTimeSamples", observedMinutes.size());
        breakdown.put("timeNote", observedMinutes.isEmpty() ? "No comparable tracked sessions yet" : "Median of comparable tracked sessions");
        return response(chance, medianMinutes, observations, ratingPrior, firstAttemptAccepted, confidence, observations < 5, breakdown);
    }

    private PredictionResponse response(int chance, int minutes, int observations, double prior, int successes, String confidence, boolean insufficient, Map<String, Object> breakdown) {
        return PredictionResponse.builder()
                .solveChance(Math.max(0, Math.min(100, chance)))
                .expectedTimeMinutes(minutes)
                .confidence(confidence)
                .breakdown(breakdown)
                .insufficientData(insufficient)
                .build();
    }

    private double logistic(double value) {
        return 1.0 / (1.0 + Math.exp(-value));
    }
}
