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
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
        
        // 1. WARMUP: strictly 1400-1500 rated unsolved problem (fallback to comfort zone range if none exists)
        problemRepository.findUnsolvedByRating(userId, 1400.0, 1500.0)
            .or(() -> problemRepository.findUnsolvedByRating(userId, (double)(ceiling - 250), (double)(ceiling - 150)))
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
            TagMastery weakest = masteries.stream()
                .filter(m -> m.getTotalAttempted() > 0)
                .min((m1, m2) -> {
                    boolean m1Perfect = m1.getTotalSolved() == m1.getTotalAttempted();
                    boolean m2Perfect = m2.getTotalSolved() == m2.getTotalAttempted();
                    if (m1Perfect != m2Perfect) {
                        return m1Perfect ? 1 : -1;
                    }
                    return Double.compare(m1.getMasteryScore(), m2.getMasteryScore());
                })
                .orElse(masteries.get(masteries.size() - 1));

            List<Problem> weakProblems = problemRepository.findRecommendedUnsolved(
                userId, weakest.getTag(), (double)(ceiling - 200), (double)(ceiling + 100), 1);
            if (!weakProblems.isEmpty()) {
                Problem p2 = weakProblems.get(0);
                result.add(PotdResponse.builder()
                    .title(p2.getTitle())
                    .titleSlug(p2.getTitleSlug())
                    .rating(p2.getActualRating())
                    .tags(p2.getTags())
                    .reason("Practice your weakest topic: " + weakest.getTag())
                    .type("WEAKNESS")
                    .build());
            }
        }

        // 3. REVISION: oldest scheduled revision card from queue (fallback to STRETCH if no revision card exists)
        List<RevisionCard> dueCards = revisionCardRepository.findByUserIdAndNextReviewBeforeOrderByNextReviewAsc(userId, LocalDateTime.now());
        RevisionCard revisionCard = null;
        if (!dueCards.isEmpty()) {
            revisionCard = dueCards.get(0);
        } else {
            List<RevisionCard> allCards = revisionCardRepository.findByUserIdOrderByNextReviewAsc(userId);
            if (!allCards.isEmpty()) {
                revisionCard = allCards.get(0);
            }
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
            problemRepository.findUnsolvedByRating(userId, (double)(ceiling + 50), (double)(ceiling + 150))
                .ifPresent(p3 -> result.add(PotdResponse.builder()
                    .title(p3.getTitle())
                    .titleSlug(p3.getTitleSlug())
                    .rating(p3.getActualRating())
                    .tags(p3.getTags())
                    .reason("Push your rating ceiling. This is slightly above your comfort zone.")
                    .type("STRETCH")
                    .build()));
        }

        return result;
    }
}
