package com.algovault.engine;

import com.algovault.model.RevisionCard;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
public class SpacedRepetitionEngine {

    public RevisionCard updateCard(RevisionCard card, int quality, double weaknessMultiplier, boolean wasContestFailure) {
        quality = Math.max(0, Math.min(5, quality));
        double ease = card.getEaseFactor() != null ? card.getEaseFactor() : 2.5;
        int interval = card.getIntervalDays() != null ? card.getIntervalDays().intValue() : 1;

        if (quality >= 3) {
            if (card.getReviewCount() == null || card.getReviewCount() == 0) {
                interval = 1;
            } else if (card.getReviewCount() == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(interval * ease);
            }
            ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        } else {
            interval = 1;
            ease = Math.max(1.3, ease - 0.2);
        }

        // Weak topic acceleration
        interval = (int) Math.floor(interval * Math.max(0.6, Math.min(1.0, weaknessMultiplier)));
        if (wasContestFailure) {
            interval = (int) Math.floor(interval * 0.5);
        }

        interval = Math.max(1, interval);

        card.setIntervalDays((double) interval);
        card.setEaseFactor(ease);
        card.setLastReviewed(java.time.LocalDateTime.now());
        card.setNextReview(java.time.LocalDateTime.now().plusDays(interval));
        card.setReviewCount(card.getReviewCount() != null ? card.getReviewCount() + 1 : 1);
        card.setConfidence(5); // Reset confidence to 100% after review

        return card;
    }
}
