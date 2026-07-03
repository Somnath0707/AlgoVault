package com.algovault.engine;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EloEngineTest {

    private final EloEngine eloEngine = new EloEngine();

    @Test
    void calculateNewElo_winLowGamesPlayed_usesK32() {
        // Player: 1500, Problem: 1600. Expected win probability is lower, so a win yields significant gains
        int result = eloEngine.calculateNewElo(1500, 1600, 1.0, 10);
        assertTrue(result > 1500);
        // Gain should use K=32 baseline
        int expectedProb = (int) Math.round(32 * (1.0 - (1.0 / (1.0 + Math.pow(10, 100.0 / 400.0)))));
        assertEquals(1500 + expectedProb, result);
    }

    @Test
    void calculateNewElo_lossHighGamesPlayed_usesK16() {
        int result = eloEngine.calculateNewElo(1500, 1400, 0.0, 40);
        assertTrue(result < 1500);
        int expectedDelta = (int) Math.round(16 * (0.0 - (1.0 / (1.0 + Math.pow(10, -100.0 / 400.0)))));
        assertEquals(1500 + expectedDelta, result);
    }
}
