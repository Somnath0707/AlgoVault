package com.algovault.service;
import com.algovault.dto.PotdResponse;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import com.algovault.model.TagMastery;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PotdService {
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final TagMasteryRepository tagMasteryRepository;

    @Cacheable(value = "potd", key = "#userId")
    public List<PotdResponse> getPotd(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        int ceiling = user.getVirtualRating() != null ? user.getVirtualRating() : 1500;

        List<PotdResponse> result = new ArrayList<>();
        
        // WARMUP: 200 points below ceiling
        problemRepository.findUnsolvedByRating(userId, (double)(ceiling - 250), (double)(ceiling - 150))
            .ifPresent(p1 -> result.add(PotdResponse.builder()
                .title(p1.getTitle())
                .titleSlug(p1.getTitleSlug())
                .rating(p1.getActualRating())
                .tags(p1.getTags())
                .reason("A quick warmup below your ceiling to build momentum.")
                .type("WARMUP")
                .build()));

        // WEAKNESS: Unsolved problem in weakest tag around comfort zone
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        if (!masteries.isEmpty() && masteries.size() >= 5) {
            TagMastery weakest = masteries.get(masteries.size() - 1);
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

        // STRETCH: 100 points above ceiling
        problemRepository.findUnsolvedByRating(userId, (double)(ceiling + 50), (double)(ceiling + 150))
            .ifPresent(p3 -> result.add(PotdResponse.builder()
                .title(p3.getTitle())
                .titleSlug(p3.getTitleSlug())
                .rating(p3.getActualRating())
                .tags(p3.getTags())
                .reason("Push your rating ceiling. This is slightly above your comfort zone.")
                .type("STRETCH")
                .build()));

        return result;
    }
}
