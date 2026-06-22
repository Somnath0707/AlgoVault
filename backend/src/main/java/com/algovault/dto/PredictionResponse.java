package com.algovault.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class PredictionResponse {
    private int solveChance;
    private int expectedTimeMinutes;
    private String confidence;
    private Map<String, Object> breakdown;
}
