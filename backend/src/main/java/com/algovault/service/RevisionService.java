package com.algovault.service;
import com.algovault.dto.RevisionResponse;
import com.algovault.engine.SpacedRepetitionEngine;
import com.algovault.model.ContestResult;
import com.algovault.model.RevisionCard;
import com.algovault.model.TagMastery;
import com.algovault.repository.ContestResultRepository;
import com.algovault.repository.RevisionCardRepository;
import com.algovault.repository.TagMasteryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RevisionService {
    private final RevisionCardRepository repository;
    private final SpacedRepetitionEngine engine;
    private final TagMasteryRepository tagMasteryRepository;
    private final ContestResultRepository contestResultRepository;

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
        
        List<String> tags = card.getProblem().getTags();
        double weaknessMultiplier = 1.0;
        if (tags != null && !tags.isEmpty()) {
            double avgMastery = 0;
            int count = 0;
            for (String tag : tags) {
                TagMastery tm = tagMasteryRepository.findByUserIdAndTag(userId, tag).orElse(null);
                if (tm != null) {
                    avgMastery += tm.getMasteryScore();
                    count++;
                }
            }
            if (count > 0) {
                avgMastery /= count;
                double userBaseline = card.getUser().getLcRating() != null
                    ? card.getUser().getLcRating()
                    : card.getUser().getVirtualRating() != null ? card.getUser().getVirtualRating() : 1500.0;
                double ratingGap = userBaseline - avgMastery;
                weaknessMultiplier = Math.max(0.6, Math.min(1.0, 1.0 - Math.max(0.0, ratingGap) / 1000.0));
            }
        }

        boolean isContestFailure = false;
        List<ContestResult> contests = contestResultRepository.findByUserIdOrderByContestDateDesc(userId);
        String slug = card.getProblem().getTitleSlug();
        for (ContestResult r : contests) {
            if (r.getQuestionDetails() != null && r.getQuestionDetails().containsKey("submissions")) {
                List<Map<String, Object>> subs = (List<Map<String, Object>>) r.getQuestionDetails().get("submissions");
                boolean attempted = false;
                boolean solved = false;
                for (Map<String, Object> s : subs) {
                    if (slug.equals(s.get("titleSlug"))) {
                        attempted = true;
                        if ("Accepted".equals(s.get("verdict"))) {
                            solved = true;
                        }
                    }
                }
                if (attempted && !solved) {
                    isContestFailure = true;
                    break;
                }
            }
        }
        
        engine.updateCard(card, quality, weaknessMultiplier, isContestFailure);
        repository.save(card);
    }
}
