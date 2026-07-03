package com.algovault.controller;

import com.algovault.dto.PredictionEvaluationResponse;
import com.algovault.dto.PredictionResponse;
import com.algovault.model.User;
import com.algovault.service.PredictionEvaluationService;
import com.algovault.service.SolveProbabilityService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PredictionControllerTest {

    @Mock
    private SolveProbabilityService service;

    @Mock
    private UserContextService userContextService;

    @Mock
    private PredictionEvaluationService evaluationService;

    @InjectMocks
    private PredictionController predictionController;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder().id(1L).username("testuser").build();
        when(userContextService.resolveUser(any(HttpServletRequest.class))).thenReturn(testUser);
    }

    @Test
    void getPrediction_returnsResponse() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        PredictionResponse predictionResponse = PredictionResponse.builder()
            .solveChance(75)
            .confidence("High")
            .build();

        when(service.predict(1L, "two-sum")).thenReturn(predictionResponse);

        ResponseEntity<PredictionResponse> response = predictionController.getPrediction(request, "two-sum");

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(75, response.getBody().getSolveChance());
        assertEquals("High", response.getBody().getConfidence());

        verify(service, times(1)).predict(1L, "two-sum");
    }

    @Test
    void getEvaluation_returnsEvaluationResponse() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        PredictionEvaluationResponse evalResponse = PredictionEvaluationResponse.builder()
            .totalResolved(10)
            .accuracyPercent(80.0)
            .brierScore(0.15)
            .build();

        when(evaluationService.getEvaluation(1L)).thenReturn(evalResponse);

        ResponseEntity<PredictionEvaluationResponse> response = predictionController.getEvaluation(request);

        assertNotNull(response);
        assertEquals(200, response.getStatusCodeValue());
        assertEquals(10, response.getBody().getTotalResolved());
        assertEquals(80.0, response.getBody().getAccuracyPercent());
        assertEquals(0.15, response.getBody().getBrierScore());

        verify(evaluationService, times(1)).getEvaluation(1L);
    }
}
