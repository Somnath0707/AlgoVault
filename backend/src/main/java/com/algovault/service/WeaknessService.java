package com.algovault.service;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.TagMastery;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
public class WeaknessService {
    private final TagMasteryRepository tagMasteryRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "weakness", key = "#userId")
    public WeaknessResponse getWeakness(Long userId) {
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        
        // Bottom 5 tags prioritizing actual failures (totalSolved < totalAttempted)
        List<WeaknessResponse.WeakTag> weakTags = masteries.stream()
            .filter(m -> m.getTotalAttempted() > 0)
            .sorted((m1, m2) -> {
                boolean m1Perfect = m1.getTotalSolved() == m1.getTotalAttempted();
                boolean m2Perfect = m2.getTotalSolved() == m2.getTotalAttempted();
                if (m1Perfect != m2Perfect) {
                    return m1Perfect ? 1 : -1;
                }
                return Double.compare(m1.getMasteryScore(), m2.getMasteryScore());
            })
            .limit(5)
            .map(m -> WeaknessResponse.WeakTag.builder()
                .tag(m.getTag())
                .masteryScore(m.getMasteryScore())
                .build())
            .collect(Collectors.toList());

        User user = userRepository.findById(userId).orElseThrow();
        int baselineRating = user.getVirtualRating() != null
            ? user.getVirtualRating()
            : user.getLcRating() != null ? user.getLcRating() : 1500;
        double minRating = Math.max(800, baselineRating - 200);
        double maxRating = baselineRating + 250;

        List<WeaknessResponse.RecommendedProblem> recommendations = new ArrayList<>();
        java.util.Set<String> recommendedSlugs = new java.util.HashSet<>();
        for (WeaknessResponse.WeakTag weakTag : weakTags) {
            List<Problem> problems = problemRepository.findRecommendedUnsolved(userId, weakTag.getTag(), minRating, maxRating, 4);
            for (Problem p : problems) {
                if (p != null && !recommendedSlugs.contains(p.getTitleSlug())) {
                    recommendedSlugs.add(p.getTitleSlug());
                    recommendations.add(WeaknessResponse.RecommendedProblem.builder()
                        .title(p.getTitle())
                        .titleSlug(p.getTitleSlug())
                        .difficulty(p.getDifficulty())
                        .actualRating(p.getActualRating())
                        .build());
                }
            }
        }

        return WeaknessResponse.builder()
            .weakTags(weakTags)
            .recommendations(recommendations.stream().limit(12).collect(Collectors.toList()))
            .build();
    }

    @org.springframework.cache.annotation.CacheEvict(value = "weakness", key = "#userId")
    public void evictWeaknessCache(Long userId) {
        // Just evicts the cache
    }
}
