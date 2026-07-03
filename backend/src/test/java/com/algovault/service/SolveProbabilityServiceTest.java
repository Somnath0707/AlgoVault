package com.algovault.service;

import com.algovault.dto.PredictionResponse;
import com.algovault.engine.SolveProbabilityEngine;
import com.algovault.model.Problem;
import com.algovault.model.User;
import com.algovault.repository.ContestResultRepository;
import com.algovault.repository.ProblemOpenEventRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
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
        Problem problem = Problem.builder().titleSlug(titleSlug).title("Brand New Problem").build();
        PredictionResponse expectedResponse = PredictionResponse.builder()
                .solveChance(50)
                .expectedTimeMinutes(30)
                .confidence("LOW")
                .insufficientData(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        // Simulate getOrCreate creating the problem dynamically
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
    }
}
