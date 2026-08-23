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
 * Gaussian-weighted Beta-binomial solve-probability estimator.
 *
 * <h3>Core Model</h3>
 * <p>For a target problem of rating R, we collect all first-attempt outcomes
 * on problems within ±{@value #COMPARABLE_RATING_WINDOW} rating points.
 * Each comparable problem receives a Gaussian distance weight:</p>
 * <pre>
 *   w(Δr) = exp(−0.5 × (Δr / σ)²)     where σ = {@value #GAUSSIAN_SIGMA}
 * </pre>
 * <p>This gives observations close to the target rating much more influence
 * than those at the boundary (e.g., Δr=10 → w≈0.98, Δr=100 → w≈0.14).</p>
 *
 * <h3>Beta-binomial Smoothing</h3>
 * <p>The posterior probability of solving is:</p>
 * <pre>
 *   P = (α₀ + Σ wᵢ·sᵢ) / (α₀ + β₀ + Σ wᵢ)
 * </pre>
 * <p>where α₀ = PRIOR_STRENGTH × prior, β₀ = PRIOR_STRENGTH × (1 − prior),
 * and the prior itself is a blend of rating-based and tag-mastery signals.</p>
 *
 * <h3>Prior Construction</h3>
 * <ul>
 *   <li><b>Rating prior</b> (weight 0.7): logistic((virtualRating − targetRating) / 400).
 *       Uses the standard 400-point Elo scale.</li>
 *   <li><b>Tag mastery prior</b> (weight 0.3): average tag mastery score mapped
 *       through a logistic centered at the target rating.
 *       Only active when the problem has tags with mastery data.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class SolveProbabilityEngine {

    /** Maximum rating distance for a problem to be considered comparable. */
    private static final int COMPARABLE_RATING_WINDOW = 100;

    /** Gaussian kernel bandwidth — controls how quickly distance weight decays. */
    private static final double GAUSSIAN_SIGMA = 50.0;

    /** Pseudo-observation count of the prior — controls prior strength. */
    private static final double PRIOR_STRENGTH = 8.0;

    /** A raw count can overstate evidence when examples sit at the edge of the rating window. */
    private static final double MIN_EFFECTIVE_EVIDENCE = 3.0;

    /** Tag estimates need a small body of direct evidence before influencing a prediction. */
    private static final int MIN_TAG_OBSERVATIONS = 3;

    /** Weight of the rating-based prior in the blended prior. */
    private static final double RATING_PRIOR_WEIGHT = 0.7;

    /** Weight of the tag-mastery prior in the blended prior. */
    private static final double TAG_PRIOR_WEIGHT = 0.3;

    public PredictionResponse predict(
            User user,
            Problem problem,
            List<Submission> submissions,
            List<TagMastery> masteries,
            List<com.algovault.model.ContestResult> ignoredContests,
            List<com.algovault.model.ProblemOpenEvent> openEvents) {

        if (problem.getActualRating() == null) {
            return response(50, 0, 0, 0.5, 0, "LOW", true, new HashMap<>());
        }

        double targetRating = problem.getActualRating();

        // ─── Step 1: Gather first-attempt outcomes ───────────────────────
        Map<Long, List<Submission>> attemptsByProblem = new LinkedHashMap<>();
        submissions.stream()
                .filter(s -> s.getProblem() != null)
                .filter(s -> s.getProblem().getId() != null)
                .filter(s -> s.getProblem().getActualRating() != null)
                .sorted(Comparator.comparing(Submission::getSubmittedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(s -> attemptsByProblem
                        .computeIfAbsent(s.getProblem().getId(), k -> new ArrayList<>())
                        .add(s));

        // ─── Step 2: Compute Gaussian-weighted evidence ──────────────────
        double weightedSuccesses = 0.0;
        double totalWeight = 0.0;
        int rawObservations = 0;

        for (List<Submission> attempts : attemptsByProblem.values()) {
            Submission first = attempts.get(0);
            double ratingDiff = Math.abs(first.getProblem().getActualRating() - targetRating);

            if (ratingDiff > COMPARABLE_RATING_WINDOW) {
                continue;
            }

            // Gaussian distance weight: observations near targetRating count more
            double w = Math.exp(-0.5 * Math.pow(ratingDiff / GAUSSIAN_SIGMA, 2));

            rawObservations++;
            totalWeight += w;

            if ("Accepted".equals(first.getVerdict())) {
                weightedSuccesses += w;
            }
        }

        // ─── Step 3: Construct blended prior ─────────────────────────────
        // Rating-based prior: standard Elo logistic with 400-point scale
        double ratingPrior = user.getVirtualRating() == null
                ? 0.5
                : logistic((user.getVirtualRating() - targetRating) / 400.0);

        // Tag-mastery prior: an evidence-weighted average mastery score → logistic.
        // A one-problem tag should be visible to the learner, but should not be
        // strong enough to move a probability estimate.
        double tagPrior = ratingPrior; // fallback if no mastery data
        boolean hasTagData = false;
        double tagEvidenceWeight = 0.0;
        if (masteries != null && !masteries.isEmpty() && problem.getTags() != null && !problem.getTags().isEmpty()) {
            Map<String, TagMastery> masteryMap = new HashMap<>();
            for (TagMastery tm : masteries) {
                masteryMap.put(tm.getTag(), tm);
            }
            double weightedMasterySum = 0.0;
            double totalTagReliability = 0.0;
            for (String tag : problem.getTags()) {
                TagMastery mastery = masteryMap.get(tag);
                if (mastery == null || mastery.getMasteryScore() == null) continue;
                int attempts = mastery.getTotalAttempted() == null ? 0 : mastery.getTotalAttempted();
                if (attempts < MIN_TAG_OBSERVATIONS) continue;

                double rd = mastery.getRd() == null ? 350.0 : mastery.getRd();
                double sampleReliability = Math.min(1.0, attempts / 8.0);
                double uncertaintyReliability = Math.max(0.1, Math.min(1.0, (350.0 - rd) / 250.0));
                double reliability = sampleReliability * uncertaintyReliability;
                weightedMasterySum += mastery.getMasteryScore() * reliability;
                totalTagReliability += reliability;
            }
            if (totalTagReliability > 0.0) {
                double avgMastery = weightedMasterySum / totalTagReliability;
                // Map mastery score to probability: how does user's mastery
                // on these tags compare to the problem's difficulty?
                tagPrior = logistic((avgMastery - targetRating) / 400.0);
                hasTagData = true;
                tagEvidenceWeight = Math.min(1.0, totalTagReliability);
            }
        }

        // Blend: rating evidence dominates; sparse/uncertain tag data only
        // gets a proportionate share of the intended 30% adjustment.
        double tagBlendWeight = hasTagData ? TAG_PRIOR_WEIGHT * tagEvidenceWeight : 0.0;
        double blendedPrior = (1.0 - tagBlendWeight) * ratingPrior + tagBlendWeight * tagPrior;

        // ─── Step 4: Beta-binomial posterior ─────────────────────────────
        double alpha0 = PRIOR_STRENGTH * blendedPrior;
        double beta0 = PRIOR_STRENGTH * (1.0 - blendedPrior);
        double alpha = alpha0 + weightedSuccesses;
        double beta = beta0 + totalWeight - weightedSuccesses;
        double posteriorTotal = alpha + beta;
        double probability = alpha / posteriorTotal;
        int chance = (int) Math.round(probability * 100.0);
        double posteriorVariance = (alpha * beta) / (posteriorTotal * posteriorTotal * (posteriorTotal + 1.0));
        double posteriorStandardError = Math.sqrt(Math.max(0.0, posteriorVariance));
        int lowerBound = (int) Math.round(Math.max(0.0, probability - 1.96 * posteriorStandardError) * 100.0);
        int upperBound = (int) Math.round(Math.min(1.0, probability + 1.96 * posteriorStandardError) * 100.0);

        // ─── Step 5: Expected time estimate ──────────────────────────────
        List<Integer> observedMinutes = new ArrayList<>();
        if (openEvents != null) {
            for (com.algovault.model.ProblemOpenEvent event : openEvents) {
                if (event.getProblem() == null || event.getProblem().getActualRating() == null
                        || event.getFocusSeconds() == null) continue;
                double diff = Math.abs(event.getProblem().getActualRating() - targetRating);
                if (diff <= COMPARABLE_RATING_WINDOW && event.getFocusSeconds() > 0) {
                    observedMinutes.add(Math.max(1, (int) Math.round(event.getFocusSeconds() / 60.0)));
                }
            }
        }
        observedMinutes.sort(Integer::compareTo);
        int medianMinutes = observedMinutes.isEmpty()
                ? 0
                : observedMinutes.get(observedMinutes.size() / 2);

        // ─── Step 6: Confidence assessment ───────────────────────────────
        String confidence;
        if (rawObservations >= 20 && totalWeight >= 12.0) {
            confidence = "HIGH";
        } else if (rawObservations >= 8 && totalWeight >= 5.0) {
            confidence = "MEDIUM";
        } else {
            confidence = "LOW";
        }

        // ─── Step 7: Build breakdown ─────────────────────────────────────
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("method", "Gaussian-weighted Beta-binomial with tag mastery blend");
        breakdown.put("comparableRatingWindow", COMPARABLE_RATING_WINDOW);
        breakdown.put("gaussianSigma", GAUSSIAN_SIGMA);
        breakdown.put("rawComparableProblems", rawObservations);
        breakdown.put("effectiveWeight", Math.round(totalWeight * 100.0) / 100.0);
        breakdown.put("weightedSuccesses", Math.round(weightedSuccesses * 100.0) / 100.0);
        breakdown.put("posterior95IntervalPercent", List.of(lowerBound, upperBound));
        breakdown.put("ratingPriorPercent", Math.round(ratingPrior * 100.0));
        breakdown.put("tagPriorPercent", hasTagData ? Math.round(tagPrior * 100.0) : "N/A");
        breakdown.put("tagEvidenceWeight", Math.round(tagEvidenceWeight * 100.0) / 100.0);
        breakdown.put("blendedPriorPercent", Math.round(blendedPrior * 100.0));
        breakdown.put("observedTimeSamples", observedMinutes.size());
        breakdown.put("timeNote", observedMinutes.isEmpty()
                ? "No comparable tracked sessions yet"
                : "Median of comparable tracked sessions");

        return response(chance, medianMinutes, rawObservations, blendedPrior,
                (int) Math.round(weightedSuccesses), confidence,
                rawObservations < 5 || totalWeight < MIN_EFFECTIVE_EVIDENCE, breakdown);
    }

    private PredictionResponse response(int chance, int minutes, int observations,
                                         double prior, int successes, String confidence,
                                         boolean insufficient, Map<String, Object> breakdown) {
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
