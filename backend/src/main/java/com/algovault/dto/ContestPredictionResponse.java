package com.algovault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestPredictionResponse {
    private String contestSlug;
    private String contestTitle;
    private Integer rank;
    private Integer problemsSolved;
    private Integer totalProblems;
    private Double finishTimeMinutes;
    private Double ratingBefore;
    private Double predictedRating;
    private Double predictedDelta;
    private String status; // "PREDICTED", "PREDICTION_PENDING", "CONFIRMED"
    private String source; // "ENTRANTHUB", "FALLBACK"
}
