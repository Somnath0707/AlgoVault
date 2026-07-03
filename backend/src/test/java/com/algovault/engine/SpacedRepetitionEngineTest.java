package com.algovault.engine;

import com.algovault.model.RevisionCard;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SpacedRepetitionEngineTest {

    private final SpacedRepetitionEngine engine = new SpacedRepetitionEngine();

    @Test
    void updateCard_goodReview_increasesInterval() {
        RevisionCard card = RevisionCard.builder()
            .reviewCount(2)
            .intervalDays(6.0)
            .easeFactor(2.5)
            .build();

        RevisionCard updated = engine.updateCard(card, 5, 1.0, false);

        assertTrue(updated.getIntervalDays() > 6.0);
        assertTrue(updated.getEaseFactor() > 2.5);
        assertEquals(3, updated.getReviewCount());
    }

    @Test
    void updateCard_contestFailure_penalizesInterval() {
        RevisionCard card = RevisionCard.builder()
            .reviewCount(2)
            .intervalDays(10.0)
            .easeFactor(2.5)
            .build();

        // 10.0 * 2.5 = 25. Then halved due to wasContestFailure=true
        RevisionCard updated = engine.updateCard(card, 4, 1.0, true);

        assertEquals(12.0, updated.getIntervalDays()); // 25 * 0.5 = 12
    }
}
