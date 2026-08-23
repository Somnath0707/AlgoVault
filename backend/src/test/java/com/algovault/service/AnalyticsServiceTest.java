package com.algovault.service;

import com.algovault.model.Problem;
import com.algovault.model.ProblemOpenEvent;
import com.algovault.model.Submission;
import com.algovault.model.User;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.SubmissionRepository.ProblemAttemptProjection;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {

    @Mock
    private MasteryService masteryService;

    @Mock
    private TopicRatingService topicRatingService;

    @Mock
    private HeatmapService heatmapService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private ProblemAttemptProjection createProjection(Long problemId, Double rating, String verdict, LocalDateTime submittedAt) {
        return new ProblemAttemptProjection() {
            @Override
            public Long getProblemId() {
                return problemId;
            }

            @Override
            public Double getProblemRating() {
                return rating;
            }

            @Override
            public String getVerdict() {
                return verdict;
            }

            @Override
            public LocalDateTime getSubmittedAt() {
                return submittedAt;
            }
        };
    }

    @Test
    void updateIncremental_submission_delegatesAndRecomputesVirtualRating() {
        Long userId = 1L;
        User user = User.builder().id(userId).lcRating(1850).build();
        Problem problem = Problem.builder().id(10L).actualRating(1600.0).tags(List.of("Array")).build();
        Submission sub = Submission.builder().id(100L).user(user).problem(problem).verdict("Accepted").build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        analyticsService.updateIncremental(userId, sub);

        verify(masteryService, times(1)).updateIncremental(userId, sub);
        verify(topicRatingService, times(1)).updateIncremental(userId, sub);
        verify(heatmapService, times(1)).updateIncremental(userId, sub);
        verify(userRepository, times(1)).save(user);
        assertEquals(1850, user.getVirtualRating());
    }

    @Test
    void updateIncremental_problemOpenEvent_delegatesToMasteryService() {
        Long userId = 1L;
        ProblemOpenEvent event = ProblemOpenEvent.builder().id(50L).build();

        analyticsService.updateIncremental(userId, event);

        verify(masteryService, times(1)).updateIncremental(userId, event);
    }

    @Test
    void recomputeVirtualRating_withNoSubmissions_defaultsTo1500() {
        Long userId = 1L;
        User user = User.builder().id(userId).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(submissionRepository.findAttemptProjectionsByUserId(userId)).thenReturn(Collections.emptyList());

        analyticsService.recomputeVirtualRating(userId);

        assertEquals(1500, user.getVirtualRating());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void recomputeVirtualRating_withExtremeHighSolveRate_clampsTo3000() {
        Long userId = 1L;
        User user = User.builder().id(userId).build();

        List<ProblemAttemptProjection> projections = new ArrayList<>();
        for (long i = 1; i <= 15; i++) {
            // Extreme ratings that would calculate > 3000
            projections.add(createProjection(i, 3200.0, "Accepted", LocalDateTime.now().minusDays(i)));
        }

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(submissionRepository.findAttemptProjectionsByUserId(userId)).thenReturn(projections);

        analyticsService.recomputeVirtualRating(userId);

        // Clamped at 3000 max
        assertEquals(3000, user.getVirtualRating());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void recomputeVirtualRating_withExtremeLowSolveRate_clampsTo800() {
        Long userId = 1L;
        User user = User.builder().id(userId).build();

        List<ProblemAttemptProjection> projections = new ArrayList<>();
        for (long i = 1; i <= 15; i++) {
            // Low rating with 0 solved
            projections.add(createProjection(i, 850.0, "Wrong Answer", LocalDateTime.now().minusDays(i)));
        }

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(submissionRepository.findAttemptProjectionsByUserId(userId)).thenReturn(projections);

        analyticsService.recomputeVirtualRating(userId);

        // Clamped at 800 min
        assertEquals(800, user.getVirtualRating());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void recomputeVirtualRating_withSmallDataset_calculatesWeightedAverage() {
        Long userId = 1L;
        User user = User.builder().id(userId).build();

        List<ProblemAttemptProjection> projections = List.of(
            createProjection(1L, 1400.0, "Accepted", LocalDateTime.now().minusDays(2)),
            createProjection(2L, 1600.0, "Accepted", LocalDateTime.now().minusDays(1))
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(submissionRepository.findAttemptProjectionsByUserId(userId)).thenReturn(projections);

        analyticsService.recomputeVirtualRating(userId);

        // avg = 1500, max = 1600 -> 0.8 * 1500 + 0.2 * 1600 = 1200 + 320 = 1520
        assertEquals(1520, user.getVirtualRating());
        verify(userRepository, times(1)).save(user);
    }
}
