package com.algovault.service;

import com.algovault.dto.PredictionResponse;
import com.algovault.engine.SolveProbabilityEngine;
import com.algovault.model.AnalyticsMetric;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;

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
        verify(analyticsMetricRepository, never()).saveAndFlush(any());
    }

    @Test
    void predict_withSufficientData_savesAnalyticsMetricIfNotAlreadyPending() {
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
        when(analyticsMetricRepository.existsByUserIdAndProblemIdAndActualResultIsNull(userId, 10L)).thenReturn(false);

        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        assertFalse(response.getInsufficientData());
        assertEquals(85, response.getSolveChance());
        verify(analyticsMetricRepository, times(1)).saveAndFlush(any(AnalyticsMetric.class));
    }

    @Test
    void predict_withSufficientData_doesNotDuplicateIfAlreadyPending() {
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
        when(analyticsMetricRepository.existsByUserIdAndProblemIdAndActualResultIsNull(userId, 10L)).thenReturn(true);

        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        verify(analyticsMetricRepository, never()).saveAndFlush(any(AnalyticsMetric.class));
    }

    @Test
    void predict_handlesConcurrentConstraintViolationGracefully() {
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
        when(analyticsMetricRepository.existsByUserIdAndProblemIdAndActualResultIsNull(userId, 10L)).thenReturn(false);
        when(analyticsMetricRepository.saveAndFlush(any(AnalyticsMetric.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate key violation"));

        when(engine.predict(eq(user), eq(problem), anyList(), anyList(), anyList(), anyList()))
                .thenReturn(expectedResponse);

        // Must not throw exception; should return expectedResponse cleanly
        PredictionResponse response = service.predict(userId, titleSlug);

        assertNotNull(response);
        assertEquals(85, response.getSolveChance());
        verify(analyticsMetricRepository, times(1)).saveAndFlush(any(AnalyticsMetric.class));
    }
}
