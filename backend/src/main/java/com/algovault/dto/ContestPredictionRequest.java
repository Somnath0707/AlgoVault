package com.algovault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestPredictionRequest {
    private String contestSlug;
    private String contestTitle;
    private String username;
    private Integer rank;
    private Integer solved;
    private Integer totalQuestions;
    private Double finishTimeMinutes;
    private Double currentRating;
    private Integer attendedContestsCount;
}
