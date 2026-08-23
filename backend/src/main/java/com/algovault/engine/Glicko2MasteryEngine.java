package com.algovault.engine;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

/**
 * Implements the Glicko-2 rating system to track Tag Mastery.
 * Every tag (e.g., "Dynamic Programming") is treated as a player.
 * Every problem attempted is treated as an opponent.
 */
@Component
public class Glicko2MasteryEngine {

    public static final double TAU = 0.5; // System constant
    public static final double SCALE = 173.7178;
    public static final double INITIAL_RATING = 1500.0;
    public static final double INITIAL_RD = 350.0;
    public static final double INITIAL_VOLATILITY = 0.06;
    public static final double MAX_RD = 350.0;

    private static final double VOLATILITY_EPSILON = 0.000001;
    private static final int MAX_VOLATILITY_BRACKET_STEPS = 100;
    private static final int MAX_VOLATILITY_ITERATIONS = 100;

    public static class GlickoRating {
        public double rating;
        public double rd; // Rating Deviation
        public double volatility;

        public GlickoRating(double rating, double rd, double volatility) {
            if (!Double.isFinite(rating)) {
                throw new IllegalArgumentException("Rating must be a finite number: " + rating);
            }
            if (!Double.isFinite(rd) || rd < 0.0) {
                throw new IllegalArgumentException("RD must be a non-negative finite number: " + rd);
            }
            if (!Double.isFinite(volatility) || volatility <= 0.0) {
                throw new IllegalArgumentException("Volatility must be a positive finite number: " + volatility);
            }
            this.rating = rating;
            this.rd = rd;
            this.volatility = volatility;
        }

        public GlickoRating() {
            this(INITIAL_RATING, INITIAL_RD, INITIAL_VOLATILITY);
        }

        public GlickoRating copy() {
            return new GlickoRating(this.rating, this.rd, this.volatility);
        }

        @Override
        public String toString() {
            return String.format(Locale.US, "GlickoRating{rating=%.2f, rd=%.2f, volatility=%.6f}",
                    rating, rd, volatility);
        }
    }

    public static class MatchResult {
        public double opponentRating;
        public double opponentRD;
        public double score; // 1.0 for Win, 0.5 for Draw, 0.0 for Loss

        public MatchResult(double opponentRating, double opponentRD, double score) {
            if (!Double.isFinite(opponentRating)) {
                throw new IllegalArgumentException("Opponent rating must be a finite number: " + opponentRating);
            }
            if (!Double.isFinite(opponentRD) || opponentRD <= 0.0) {
                throw new IllegalArgumentException("Opponent RD must be positive and finite: " + opponentRD);
            }
            if (!Double.isFinite(score) || score < 0.0 || score > 1.0) {
                throw new IllegalArgumentException("Score must be between 0.0 and 1.0: " + score);
            }
            this.opponentRating = opponentRating;
            this.opponentRD = opponentRD;
            this.score = score;
        }

        @Override
        public String toString() {
            return String.format(Locale.US, "MatchResult{opponentRating=%.2f, opponentRD=%.2f, score=%.2f}",
                    opponentRating, opponentRD, score);
        }
    }

    public double g(double phi) {
        return 1.0 / Math.sqrt(1.0 + 3.0 * phi * phi / (Math.PI * Math.PI));
    }

    public double E(double mu, double muJ, double phiJ) {
        return 1.0 / (1.0 + Math.exp(-g(phiJ) * (mu - muJ)));
    }

    public double computeVariance(double mu, List<MatchResult> matches) {
        if (matches == null || matches.isEmpty()) {
            return Double.POSITIVE_INFINITY;
        }
        double vInv = 0.0;
        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - INITIAL_RATING) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);
            vInv += gj * gj * ej * (1.0 - ej);
        }
        return (vInv > 0.0 && Double.isFinite(vInv)) ? (1.0 / vInv) : Double.POSITIVE_INFINITY;
    }

    public double computeVariance(List<MatchResult> matches) {
        return computeVariance(0.0, matches);
    }

    public double computeDelta(double mu, double variance, List<MatchResult> matches) {
        if (matches == null || matches.isEmpty() || !Double.isFinite(variance) || variance <= 0.0) {
            return 0.0;
        }
        double deltaSum = 0.0;
        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - INITIAL_RATING) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);
            deltaSum += gj * (m.score - ej);
        }
        return variance * deltaSum;
    }

    public double computeDelta(double variance, List<MatchResult> matches) {
        return computeDelta(0.0, variance, matches);
    }

    public GlickoRating applyTimeDecay(GlickoRating current, int periods) {
        if (current == null) {
            throw new IllegalArgumentException("Current rating cannot be null");
        }
        if (periods <= 0) {
            return current.copy();
        }
        double phi = current.rd / SCALE;
        double sigma = current.volatility;
        for (int i = 0; i < periods; i++) {
            phi = Math.sqrt(phi * phi + sigma * sigma);
        }
        double newRd = Math.min(phi * SCALE, MAX_RD);
        return new GlickoRating(current.rating, newRd, current.volatility);
    }

    public GlickoRating updateRating(GlickoRating current, List<MatchResult> matches) {
        if (current == null) {
            throw new IllegalArgumentException("Current rating cannot be null");
        }
        if (matches == null || matches.isEmpty()) {
            return applyTimeDecay(current, 1);
        }

        // Step 2: Convert to Glicko-2 scale
        double mu = (current.rating - INITIAL_RATING) / SCALE;
        double phi = current.rd / SCALE;
        double sigma = current.volatility;

        // Step 3 & 4: Compute variance v and estimated improvement delta
        double vInv = 0.0;
        double deltaSum = 0.0;

        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - INITIAL_RATING) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);

            vInv += gj * gj * ej * (1.0 - ej);
            deltaSum += gj * (m.score - ej);
        }

        if (!(vInv > 0.0) || !Double.isFinite(vInv)) {
            // Degenerate numerical inputs should increase uncertainty, not
            // manufacture a large rating movement.
            return applyTimeDecay(current, 1);
        }

        double v = 1.0 / vInv;
        double delta = v * deltaSum;

        // Step 5: Update volatility (sigma) using Illinois algorithm
        double a = Math.log(sigma * sigma);
        double A = a;
        double B;
        boolean hasBracket = true;

        if (delta * delta > phi * phi + v) {
            B = Math.log(delta * delta - phi * phi - v);
        } else {
            int k = 1;
            double bracketValue = f(a - k * TAU, delta, phi, v, a);
            while (Double.isFinite(bracketValue) && bracketValue < 0 && k < MAX_VOLATILITY_BRACKET_STEPS) {
                k++;
                bracketValue = f(a - k * TAU, delta, phi, v, a);
            }
            B = a - k * TAU;
            hasBracket = Double.isFinite(bracketValue) && bracketValue >= 0;
        }

        double newSigma = sigma;
        if (hasBracket && Double.isFinite(B)) {
            double fAVal = f(A, delta, phi, v, a);
            double fBVal = f(B, delta, phi, v, a);
            int iteration = 0;
            while (Double.isFinite(fAVal) && Double.isFinite(fBVal)
                    && Math.abs(B - A) > VOLATILITY_EPSILON
                    && iteration++ < MAX_VOLATILITY_ITERATIONS) {
                double denominator = fBVal - fAVal;
                if (Math.abs(denominator) < 1e-12 || !Double.isFinite(denominator)) break;

                double C = A + (A - B) * fAVal / denominator;
                double fCVal = f(C, delta, phi, v, a);
                if (!Double.isFinite(C) || !Double.isFinite(fCVal)) break;

                if (fCVal * fBVal <= 0) {
                    A = B;
                    fAVal = fBVal;
                } else {
                    fAVal = fAVal / 2.0;
                }

                B = C;
                fBVal = fCVal;
            }

            if (Math.abs(B - A) <= VOLATILITY_EPSILON) {
                double candidate = Math.exp(A / 2.0);
                if (Double.isFinite(candidate) && candidate > 0.0) newSigma = candidate;
            } else if (Double.isFinite(A) && A > -50.0) {
                // Safe fallback to bracket bound A when iteration limit is reached
                double candidate = Math.exp(A / 2.0);
                if (Double.isFinite(candidate) && candidate > 0.0) {
                    newSigma = candidate;
                }
            }
        }

        // Step 6: Update RD to pre-rating period value
        double phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

        // Step 7: Update rating and RD
        double phiPrimeInv = 1.0 / (phiStar * phiStar) + 1.0 / v;
        double newPhi = 1.0 / Math.sqrt(phiPrimeInv);

        double newMuSum = 0.0;
        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - INITIAL_RATING) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);
            newMuSum += gj * (m.score - ej);
        }
        double newMu = mu + newPhi * newPhi * newMuSum;

        // Step 8: Convert back to original scale
        double newRating = INITIAL_RATING + newMu * SCALE;
        double newRd = newPhi * SCALE;

        return new GlickoRating(newRating, newRd, newSigma);
    }

    private double f(double x, double delta, double phi, double v, double a) {
        double ex = Math.exp(x);
        double num = ex * (delta * delta - phi * phi - v - ex);
        double den = 2.0 * Math.pow(phi * phi + v + ex, 2.0);
        return (num / den) - ((x - a) / (TAU * TAU));
    }
}
