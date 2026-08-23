package com.algovault.engine;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class Glicko2MasteryEngineTest {

    private final Glicko2MasteryEngine engine = new Glicko2MasteryEngine();

    @Test
    void updateRating_noMatches_decaysRatingDeviation() {
        Glicko2MasteryEngine.GlickoRating initial = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(initial, null);

        assertEquals(1500.0, updated.rating);
        assertTrue(updated.rd > 200.0, "RD should increase in empty period");
        assertEquals(0.06, updated.volatility, 1e-6);
    }

    @Test
    void updateRating_singleWinAgainstLowerRatedOpponent_increasesRating() {
        Glicko2MasteryEngine.GlickoRating initial = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1400.0, 30.0, 1.0)
        );

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(initial, matches);

        assertTrue(updated.rating > 1500.0, "Rating should increase after a win");
        assertTrue(updated.rd < 200.0, "RD should decrease after a match");
        assertTrue(updated.volatility > 0.0, "Volatility must remain positive");
    }

    @Test
    void updateRating_singleLossAgainstHigherRatedOpponent_decreasesRating() {
        Glicko2MasteryEngine.GlickoRating initial = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1600.0, 30.0, 0.0)
        );

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(initial, matches);

        assertTrue(updated.rating < 1500.0, "Rating should decrease after a loss");
        assertTrue(updated.rd < 200.0, "RD should decrease after a match");
    }

    /**
     * Exact reference test vector from Mark Glickman's published Glicko-2 specification paper (Section 4):
     * Initial Player: Rating = 1500.0, RD = 200.0, Volatility = 0.06 (tau = 0.5)
     * Matches in period:
     *   1. Opponent (1400.0, 30.0), Score = 1.0
     *   2. Opponent (1550.0, 100.0), Score = 0.0
     *   3. Opponent (1700.0, 300.0), Score = 0.0
     *
     * Expected post-period values (paper Section 4):
     *   Rating ≈ 1464.06
     *   RD ≈ 151.52
     *   Volatility ≈ 0.05999
     */
    @Test
    void updateRating_glickmanPublishedTestVector_matchesOfficialPaper() {
        Glicko2MasteryEngine.GlickoRating player = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1400.0, 30.0, 1.0),
            new Glicko2MasteryEngine.MatchResult(1550.0, 100.0, 0.0),
            new Glicko2MasteryEngine.MatchResult(1700.0, 300.0, 0.0)
        );

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(player, matches);

        assertEquals(1464.06, updated.rating, 0.05, "Rating should match Glickman example ~1464.06");
        assertEquals(151.52, updated.rd, 0.05, "RD should match Glickman example ~151.52");
        assertEquals(0.05999, updated.volatility, 0.0001, "Volatility should match Glickman example ~0.05999");
    }

    @Test
    void updateRating_monthlyBatch_multipleMatchesInOnePeriod() {
        Glicko2MasteryEngine.GlickoRating player = new Glicko2MasteryEngine.GlickoRating(1500.0, 350.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1300.0, 50.0, 1.0),
            new Glicko2MasteryEngine.MatchResult(1400.0, 50.0, 0.5),
            new Glicko2MasteryEngine.MatchResult(1500.0, 50.0, 0.0)
        );

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(player, matches);

        assertTrue(Double.isFinite(updated.rating));
        assertTrue(Double.isFinite(updated.rd));
        assertTrue(Double.isFinite(updated.volatility));
        assertTrue(updated.rd < 350.0, "RD must decrease after 3 matches");
        assertTrue(updated.volatility > 0.001 && updated.volatility < 1.0, "Volatility should remain within sane bounds");
    }

    @Test
    void updateRating_degenerateVariance_allOpponentsHighRD_handledGracefully() {
        Glicko2MasteryEngine.GlickoRating player = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1500.0, 500.0, 1.0),
            new Glicko2MasteryEngine.MatchResult(1500.0, 500.0, 0.0)
        );

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(player, matches);

        assertTrue(Double.isFinite(updated.rating));
        assertTrue(Double.isFinite(updated.rd));
        assertTrue(Double.isFinite(updated.volatility));
        assertTrue(updated.rd <= Glicko2MasteryEngine.MAX_RD);
    }

    @Test
    void updateRating_volatilityStaysWithinSaneBoundsAcrossManyRounds() {
        Glicko2MasteryEngine.GlickoRating player = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        for (int i = 0; i < 50; i++) {
            double score = (i % 2 == 0) ? 1.0 : 0.0;
            List<Glicko2MasteryEngine.MatchResult> matches = List.of(
                new Glicko2MasteryEngine.MatchResult(1500.0 + (i % 5) * 50.0, 60.0, score)
            );
            player = engine.updateRating(player, matches);
            assertTrue(player.volatility > 0.001, "Volatility must not drop below 0.001");
            assertTrue(player.volatility < 1.0, "Volatility must not exceed 1.0");
        }
    }

    @Test
    void applyTimeDecay_multiplePeriods_strictlyIncreasesRDToMax() {
        Glicko2MasteryEngine.GlickoRating player = new Glicko2MasteryEngine.GlickoRating(1500.0, 100.0, 0.06);
        Glicko2MasteryEngine.GlickoRating decayed1 = engine.applyTimeDecay(player, 1);
        Glicko2MasteryEngine.GlickoRating decayed6 = engine.applyTimeDecay(player, 6);
        Glicko2MasteryEngine.GlickoRating decayed2000 = engine.applyTimeDecay(player, 2000);

        assertTrue(decayed1.rd > 100.0);
        assertTrue(decayed6.rd > decayed1.rd);
        assertEquals(Glicko2MasteryEngine.MAX_RD, decayed2000.rd, 1e-6);
        assertEquals(1500.0, decayed2000.rating, 1e-6);
        assertEquals(0.06, decayed2000.volatility, 1e-6);
    }

    @Test
    void glickoRating_inputValidation_throwsOnInvalidValues() {
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.GlickoRating(Double.NaN, 200.0, 0.06));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.GlickoRating(1500.0, -10.0, 0.06));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.0));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, -0.05));
    }

    @Test
    void matchResult_inputValidation_throwsOnInvalidValues() {
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.MatchResult(Double.NaN, 30.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.MatchResult(1500.0, 0.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.MatchResult(1500.0, -10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.MatchResult(1500.0, 30.0, 1.5));
        assertThrows(IllegalArgumentException.class, () -> new Glicko2MasteryEngine.MatchResult(1500.0, 30.0, -0.1));
    }

    @Test
    void helperMethods_g_E_computeVariance_and_computeDelta() {
        double gVal = engine.g(0.5);
        assertTrue(gVal > 0.0 && gVal < 1.0);

        double eVal = engine.E(0.0, 0.0, 0.5);
        assertEquals(0.5, eVal, 1e-6);

        List<Glicko2MasteryEngine.MatchResult> matches = List.of(
            new Glicko2MasteryEngine.MatchResult(1400.0, 30.0, 1.0)
        );

        double variance = engine.computeVariance(0.0, matches);
        assertTrue(variance > 0.0 && Double.isFinite(variance));

        double delta = engine.computeDelta(0.0, variance, matches);
        assertTrue(delta > 0.0);
    }
}
