package com.algovault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {
    private int solveChance;
    private int expectedTimeMinutes;
    private String confidence;
    private Map<String, Object> breakdown;
    private Boolean insufficientData;
}
