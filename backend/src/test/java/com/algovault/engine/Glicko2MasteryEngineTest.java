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
        assertTrue(updated.rd > 200.0); // RD should increase (time decay)
        assertEquals(0.06, updated.volatility);
    }

    @Test
    void updateRating_winsAgainstMatches_increasesRating() {
        Glicko2MasteryEngine.GlickoRating initial = new Glicko2MasteryEngine.GlickoRating(1500.0, 200.0, 0.06);
        List<Glicko2MasteryEngine.MatchResult> matches = new ArrayList<>();
        matches.add(new Glicko2MasteryEngine.MatchResult(1400.0, 30.0, 1.0)); // Win against 1400
        matches.add(new Glicko2MasteryEngine.MatchResult(1550.0, 100.0, 1.0)); // Win against 1550

        Glicko2MasteryEngine.GlickoRating updated = engine.updateRating(initial, matches);

        assertTrue(updated.rating > 1500.0);
        assertTrue(updated.rd < 200.0); // RD should decrease (more information)
    }
}
