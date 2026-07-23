package com.algovault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeaknessResponse {
    private List<WeakTag> weakTags;
    private List<RecommendedProblem> recommendations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeakTag {
        private String tag;
        private Double masteryScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedProblem {
        private String title;
        private String titleSlug;
        private String tag;
        private String difficulty;
        private Double actualRating;
        private Integer frontendId;
        private Double acceptanceRate;
    }
}
