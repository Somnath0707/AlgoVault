package com.algovault.service;
import com.algovault.dto.PotdResponse;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import com.algovault.repository.RevisionCardRepository;
import com.algovault.model.TagMastery;
import com.algovault.model.RevisionCard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.cache.annotation.Cacheable;

@Service
@RequiredArgsConstructor
public class PotdService {
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final TagMasteryRepository tagMasteryRepository;
    private final RevisionCardRepository revisionCardRepository;

    @Cacheable(value = "potd", key = "#userId")
    public List<PotdResponse> getPotd(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        int ceiling = user.getVirtualRating() != null ? user.getVirtualRating() : 1500;

        List<PotdResponse> result = new ArrayList<>();
        
        // 1. WARMUP: dynamically scaled unsolved problem just below the user's rating ceiling
        problemRepository.findUnsolvedByRating(userId, (double)(ceiling - 300), (double)(ceiling - 100))
            .or(() -> problemRepository.findUnsolvedByRating(userId, (double)(ceiling - 400), (double)(ceiling - 50)))
            .ifPresent(p1 -> result.add(PotdResponse.builder()
                .title(p1.getTitle())
                .titleSlug(p1.getTitleSlug())
                .rating(p1.getActualRating())
                .tags(p1.getTags())
                .reason("Warmup with an easier unsolved problem to build momentum.")
                .type("WARMUP")
                .build()));

        // 2. WEAKNESS: unsolved problem in weakest tag (prioritizing tags with actual failures)
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        if (!masteries.isEmpty()) {
            List<TagMastery> sortedWeaknesses = masteries.stream()
                .filter(m -> m.getTotalAttempted() > 0)
                .sorted((m1, m2) -> {
                    boolean m1Perfect = m1.getTotalSolved() == m1.getTotalAttempted();
                    boolean m2Perfect = m2.getTotalSolved() == m2.getTotalAttempted();
                    if (m1Perfect != m2Perfect) {
                        return m1Perfect ? 1 : -1;
                    }
                    return Double.compare(m1.getMasteryScore(), m2.getMasteryScore());
                }).toList();
                
            if (sortedWeaknesses.isEmpty() && !masteries.isEmpty()) {
                sortedWeaknesses = List.of(masteries.get(masteries.size() - 1));
            }

            for (TagMastery tagMastery : sortedWeaknesses) {
                List<Problem> weakProblems = problemRepository.findRecommendedUnsolved(
                    userId, tagMastery.getTag(), (double)(ceiling - 200), (double)(ceiling + 100), 1);
                
                if (!weakProblems.isEmpty()) {
                    Problem p2 = weakProblems.get(0);
                    result.add(PotdResponse.builder()
                        .title(p2.getTitle())
                        .titleSlug(p2.getTitleSlug())
                        .rating(p2.getActualRating())
                        .tags(p2.getTags())
                        .reason("Practice your weakest topic: " + tagMastery.getTag())
                        .type("WEAKNESS")
                        .build());
                    break;
                }
            }
        }

        // 3. REVISION: oldest scheduled revision card from queue (fallback to STRETCH if no revision card exists)
        List<RevisionCard> dueCards = revisionCardRepository.findByUserIdAndNextReviewBeforeOrderByNextReviewAsc(userId, LocalDateTime.now());
        RevisionCard revisionCard = null;
        if (!dueCards.isEmpty()) {
            revisionCard = dueCards.get(0);
        }

        if (revisionCard != null) {
            Problem p3 = revisionCard.getProblem();
            result.add(PotdResponse.builder()
                .title(p3.getTitle())
                .titleSlug(p3.getTitleSlug())
                .rating(p3.getActualRating())
                .tags(p3.getTags())
                .reason("Scheduled review: " + p3.getTitle())
                .type("REVISION")
                .build());
        } else {
            problemRepository.findUnsolvedByRating(userId, (double)(ceiling + 100), (double)(ceiling + 300))
                .or(() -> problemRepository.findUnsolvedByRating(userId, (double)ceiling, (double)(ceiling + 400)))
                .ifPresent(p3 -> result.add(PotdResponse.builder()
                    .title(p3.getTitle())
                    .titleSlug(p3.getTitleSlug())
                    .rating(p3.getActualRating())
                    .tags(p3.getTags())
                    .reason("Push your rating ceiling. This is strictly above your comfort zone.")
                    .type("STRETCH")
                    .build()));
        }

        return result;
    }
}
