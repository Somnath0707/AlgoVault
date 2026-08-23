package com.algovault.service;

import com.algovault.dto.PredictionEvaluationResponse;
import com.algovault.model.AnalyticsMetric;
import com.algovault.repository.AnalyticsMetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PredictionEvaluationServiceTest {

    @Mock
    private AnalyticsMetricRepository repository;

    @InjectMocks
    private PredictionEvaluationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getEvaluation_withNoResolvedMetrics_returnsZeroedResponse() {
        when(repository.findByUserIdAndActualResultIsNotNull(1L)).thenReturn(Collections.emptyList());

        PredictionEvaluationResponse response = service.getEvaluation(1L);

        assertNotNull(response);
        assertEquals(0, response.getTotalResolved());
        assertEquals(0.0, response.getAccuracyPercent());
        assertEquals(0.0, response.getBrierScore());
    }

    @Test
    void getEvaluation_clampsInvalidPredictedProbabilitiesAndCalculatesBrierScore() {
        // Metric 1: Perfect prediction (100% -> true)
        AnalyticsMetric m1 = AnalyticsMetric.builder().id(1L).predictedProbability(100.0).actualResult(true).build();
        // Metric 2: Overflown prediction (150% -> should clamp to 1.0 -> false)
        AnalyticsMetric m2 = AnalyticsMetric.builder().id(2L).predictedProbability(150.0).actualResult(false).build();
        // Metric 3: Underflown prediction (-20% -> should clamp to 0.0 -> false)
        AnalyticsMetric m3 = AnalyticsMetric.builder().id(3L).predictedProbability(-20.0).actualResult(false).build();
        // Metric 4: Standard accurate prediction (80% -> true)
        AnalyticsMetric m4 = AnalyticsMetric.builder().id(4L).predictedProbability(80.0).actualResult(true).build();

        when(repository.findByUserIdAndActualResultIsNotNull(1L)).thenReturn(List.of(m1, m2, m3, m4));

        PredictionEvaluationResponse response = service.getEvaluation(1L);

        assertNotNull(response);
        assertEquals(4, response.getTotalResolved());
        
        // Correct predictions:
        // m1: predicted 1.0 (>=0.5), actual true -> correct
        // m2: predicted 1.0 (>=0.5), actual false -> incorrect
        // m3: predicted 0.0 (<0.5), actual false -> correct
        // m4: predicted 0.8 (>=0.5), actual true -> correct
        // Accuracy = 3 / 4 = 75.0%
        assertEquals(75.0, response.getAccuracyPercent(), 0.1);

        // Brier scores:
        // m1: (1.0 - 1.0)^2 = 0.0
        // m2: (1.0 - 0.0)^2 = 1.0
        // m3: (0.0 - 0.0)^2 = 0.0
        // m4: (0.8 - 1.0)^2 = 0.04
        // Mean Brier = (0.0 + 1.0 + 0.0 + 0.04) / 4 = 1.04 / 4 = 0.26
        assertEquals(0.26, response.getBrierScore(), 0.001);
    }
}
