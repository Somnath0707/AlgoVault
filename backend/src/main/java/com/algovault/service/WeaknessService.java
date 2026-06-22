package com.algovault.service;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.TagMastery;
import com.algovault.repository.TagMasteryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WeaknessService {
    private final TagMasteryRepository tagMasteryRepository;

    @Cacheable(value = "weakness", key = "#userId")
    public WeaknessResponse getWeakness(Long userId) {
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        
        // Bottom 5 tags (reverse order)
        List<WeaknessResponse.WeakTag> weakTags = masteries.stream()
            .filter(m -> m.getTotalAttempted() != null && m.getTotalAttempted() > 5) // At least 5 attempts
            .sorted((m1, m2) -> Double.compare(m1.getMasteryScore(), m2.getMasteryScore()))
            .limit(5)
            .map(m -> WeaknessResponse.WeakTag.builder()
                .tag(m.getTag())
                .masteryScore(m.getMasteryScore())
                .build())
            .collect(Collectors.toList());

        List<WeaknessResponse.RecommendedProblem> recommendations = new ArrayList<>();
        // TODO: Implement actual problem recommendations using SimilarityEngine

        return WeaknessResponse.builder()
            .weakTags(weakTags)
            .recommendations(recommendations)
            .build();
    }
}
