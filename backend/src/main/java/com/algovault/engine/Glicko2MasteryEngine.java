package com.algovault.engine;

import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Implements the Glicko-2 rating system to track Tag Mastery.
 * Every tag (e.g., "Dynamic Programming") is treated as a player.
 * Every problem attempted is treated as an opponent.
 */
@Component
public class Glicko2MasteryEngine {

    private static final double TAU = 0.5; // System constant
    private static final double SCALE = 173.7178;

    public static class GlickoRating {
        public double rating;
        public double rd; // Rating Deviation
        public double volatility;

        public GlickoRating(double rating, double rd, double volatility) {
            this.rating = rating;
            this.rd = rd;
            this.volatility = volatility;
        }

        public GlickoRating() {
            this(1500.0, 350.0, 0.06);
        }
    }

    public static class MatchResult {
        public double opponentRating;
        public double opponentRD;
        public double score; // 1.0 for Win, 0.5 for Draw, 0.0 for Loss

        public MatchResult(double opponentRating, double opponentRD, double score) {
            this.opponentRating = opponentRating;
            this.opponentRD = opponentRD;
            this.score = score;
        }
    }

    private double g(double phi) {
        return 1.0 / Math.sqrt(1.0 + 3.0 * phi * phi / (Math.PI * Math.PI));
    }

    private double E(double mu, double muJ, double phiJ) {
        return 1.0 / (1.0 + Math.exp(-g(phiJ) * (mu - muJ)));
    }

    public GlickoRating updateRating(GlickoRating current, List<MatchResult> matches) {
        if (matches == null || matches.isEmpty()) {
            // Apply time decay (only RD increases)
            double phi = current.rd / SCALE;
            double phiPrime = Math.sqrt(phi * phi + current.volatility * current.volatility);
            double newRd = Math.min(phiPrime * SCALE, 350.0);
            return new GlickoRating(current.rating, newRd, current.volatility);
        }

        // Step 2: Convert to Glicko-2 scale
        double mu = (current.rating - 1500.0) / SCALE;
        double phi = current.rd / SCALE;
        double sigma = current.volatility;

        // Step 3 & 4: Compute variance v and estimated improvement delta
        double vInv = 0.0;
        double deltaSum = 0.0;

        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - 1500.0) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);

            vInv += gj * gj * ej * (1.0 - ej);
            deltaSum += gj * (m.score - ej);
        }

        double v = 1.0 / vInv;
        double delta = v * deltaSum;

        // Step 5: Update volatility (sigma) using Illinois algorithm
        double a = Math.log(sigma * sigma);
        double fA = f(a, delta, phi, v, a);
        double A = a;
        double B;

        if (delta * delta > phi * phi + v) {
            B = Math.log(delta * delta - phi * phi - v);
        } else {
            int k = 1;
            while (f(a - k * TAU, delta, phi, v, a) < 0) {
                k++;
            }
            B = a - k * TAU;
        }

        double fA_val = f(A, delta, phi, v, a);
        double fB_val = f(B, delta, phi, v, a);

        double epsilon = 0.000001;
        while (Math.abs(B - A) > epsilon) {
            double C = A + (A - B) * fA_val / (fB_val - fA_val);
            double fC_val = f(C, delta, phi, v, a);

            if (fC_val * fB_val <= 0) {
                A = B;
                fA_val = fB_val;
            } else {
                fA_val = fA_val / 2.0;
            }

            B = C;
            fB_val = fC_val;
        }

        double newSigma = Math.exp(A / 2.0);

        // Step 6: Update RD to pre-rating period value
        double phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

        // Step 7: Update rating and RD
        double phiPrimeInv = 1.0 / (phiStar * phiStar) + 1.0 / v;
        double newPhi = 1.0 / Math.sqrt(phiPrimeInv);

        double newMuSum = 0.0;
        for (MatchResult m : matches) {
            double muJ = (m.opponentRating - 1500.0) / SCALE;
            double phiJ = m.opponentRD / SCALE;
            double gj = g(phiJ);
            double ej = E(mu, muJ, phiJ);
            newMuSum += gj * (m.score - ej);
        }
        double newMu = mu + newPhi * newPhi * newMuSum;

        // Step 8: Convert back to original scale
        double newRating = 1500.0 + newMu * SCALE;
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
