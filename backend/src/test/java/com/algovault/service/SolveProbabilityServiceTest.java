package com.algovault.service;

import com.algovault.dto.PredictionResponse;
import com.algovault.engine.SolveProbabilityEngine;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SolveProbabilityServiceTest {

    @Mock
    private SolveProbabilityEngine engine;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProblemService problemService;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private TagMasteryRepository tagMasteryRepository;

    @Mock
    private ContestResultRepository contestResultRepository;

    @Mock
    private ProblemOpenEventRepository problemOpenEventRepository;

    @Mock
    private AnalyticsMetricRepository analyticsMetricRepository;

    @InjectMocks
    private SolveProbabilityService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void predict_withNewProblem_createsProblemAndSucceeds() {
        Long userId = 1L;
        String titleSlug = "brand-new-problem";
        User user = User.builder().id(userId).username("testuser").build();
        Problem problem = Problem.builder().id(10L).titleSlug(titleSlug).title("Brand New Problem").build();
        PredictionResponse expectedResponse = PredictionResponse.builder()
                .solveChance(50)
                .expectedTimeMinutes(30)
                .confidence("LOW")
                .insufficientData(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(problemService.getOrCreate(titleSlug, null)).thenReturn(problem);
        when(submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId)).thenReturn(new ArrayList<>());
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId)).thenReturn(new ArrayList<>());
        when(contestResultRepository.findByUserIdOrderByContestDateDesc(userId)).thenReturn(new ArrayList<>());
        when(problemOpenEventRepository.findByUserId(userId)).thenReturn(new ArrayList<>());
        
        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        assertTrue(response.getInsufficientData());
        assertEquals(50, response.getSolveChance());
        
        verify(problemService, times(1)).getOrCreate(titleSlug, null);
        verify(engine, times(1)).predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList());
        verify(analyticsMetricRepository, never()).insertPendingMetricIfAbsent(any(), any(), anyDouble(), any(), any(), any());
    }

    @Test
    void predict_withSufficientData_callsAtomicInsertPendingMetricIfAbsent() {
        Long userId = 1L;
        String titleSlug = "two-sum";
        User user = User.builder().id(userId).username("testuser").build();
        Problem problem = Problem.builder().id(10L).titleSlug(titleSlug).title("Two Sum").tags(List.of("Array")).actualRating(1200.0).build();
        PredictionResponse expectedResponse = PredictionResponse.builder()
                .solveChance(85)
                .expectedTimeMinutes(15)
                .confidence("HIGH")
                .insufficientData(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(problemService.getOrCreate(titleSlug, null)).thenReturn(problem);
        when(submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId)).thenReturn(new ArrayList<>());
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId)).thenReturn(new ArrayList<>());
        when(contestResultRepository.findByUserIdOrderByContestDateDesc(userId)).thenReturn(new ArrayList<>());
        when(problemOpenEventRepository.findByUserId(userId)).thenReturn(new ArrayList<>());
        when(analyticsMetricRepository.insertPendingMetricIfAbsent(eq(1L), eq(10L), eq(85.0), eq(1200.0), eq("Array"), eq("HIGH"))).thenReturn(1);

        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        assertFalse(response.getInsufficientData());
        assertEquals(85, response.getSolveChance());
        verify(analyticsMetricRepository, times(1)).insertPendingMetricIfAbsent(eq(1L), eq(10L), eq(85.0), eq(1200.0), eq("Array"), eq("HIGH"));
    }

    @Test
    void predict_whenPendingMetricAlreadyExists_returnsCleanlyWithoutException() {
        Long userId = 1L;
        String titleSlug = "two-sum";
        User user = User.builder().id(userId).username("testuser").build();
        Problem problem = Problem.builder().id(10L).titleSlug(titleSlug).title("Two Sum").tags(List.of("Array")).actualRating(1200.0).build();
        PredictionResponse expectedResponse = PredictionResponse.builder()
                .solveChance(85)
                .expectedTimeMinutes(15)
                .confidence("HIGH")
                .insufficientData(false)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(problemService.getOrCreate(titleSlug, null)).thenReturn(problem);
        when(submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId)).thenReturn(new ArrayList<>());
        when(tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId)).thenReturn(new ArrayList<>());
        when(contestResultRepository.findByUserIdOrderByContestDateDesc(userId)).thenReturn(new ArrayList<>());
        when(problemOpenEventRepository.findByUserId(userId)).thenReturn(new ArrayList<>());
        // Return 0 indicating row already existed and ON CONFLICT DO NOTHING ignored it
        when(analyticsMetricRepository.insertPendingMetricIfAbsent(any(), any(), anyDouble(), any(), any(), any())).thenReturn(0);

        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        assertEquals(85, response.getSolveChance());
        verify(analyticsMetricRepository, times(1)).insertPendingMetricIfAbsent(eq(1L), eq(10L), eq(85.0), eq(1200.0), eq("Array"), eq("HIGH"));
    }
}
