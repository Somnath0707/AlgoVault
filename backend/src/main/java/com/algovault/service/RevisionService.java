package com.algovault.service;
import com.algovault.dto.RevisionResponse;
import com.algovault.engine.SpacedRepetitionEngine;
import com.algovault.model.RevisionCard;
import com.algovault.repository.RevisionCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RevisionService {
    private final RevisionCardRepository repository;
    private final SpacedRepetitionEngine engine;

    public List<RevisionResponse> getQueue(Long userId) {
        List<RevisionCard> cards = repository.findByUserIdAndNextReviewBeforeOrderByNextReviewAsc(userId, LocalDateTime.now());
        return cards.stream().map(c -> RevisionResponse.builder()
            .id(c.getId())
            .title(c.getProblem().getTitle())
            .titleSlug(c.getProblem().getTitleSlug())
            .confidence(c.getConfidence())
            .intervalDays(c.getIntervalDays())
            .nextReview(c.getNextReview())
            .lastReviewed(c.getLastReviewed())
            .reviewCount(c.getReviewCount())
            .build()).collect(Collectors.toList());
    }

    @Transactional
    public void reviewCard(Long userId, Long cardId, int quality) {
        RevisionCard card = repository.findById(cardId).orElseThrow();
        if (!card.getUser().getId().equals(userId)) throw new RuntimeException("Unauthorized");
        
        // In a real scenario, weaknessMultiplier and contestFailure would be dynamically fetched
        double weaknessMultiplier = 0.0;
        boolean isContestFailure = false;
        
        engine.updateCard(card, quality, weaknessMultiplier, isContestFailure);
        repository.save(card);
    }
}
