package com.algovault.service;

import com.algovault.engine.Glicko2MasteryEngine;
import com.algovault.model.*;
import com.algovault.repository.ProblemOpenEventRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TopicRatingRepository;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TopicRatingServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private TopicRatingRepository topicRatingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProblemOpenEventRepository problemOpenEventRepository;

    @Mock
    private Glicko2MasteryEngine glickoEngine;

    @InjectMocks
    private TopicRatingService topicRatingService;

    private User testUser;
    private Problem testProblem;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder().id(1L).lcRating(1600).virtualRating(1600).build();
        testProblem = Problem.builder().id(10L).titleSlug("two-sum").tags(List.of("Array")).actualRating(1200.0).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(problemOpenEventRepository.findByUserId(1L)).thenReturn(Collections.emptyList());
        when(glickoEngine.applyTimeDecay(any(), anyInt())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void testEloRecomputeAndIncrementalAgreement() {
        when(glickoEngine.updateRating(any(), any())).thenReturn(
            new Glicko2MasteryEngine.GlickoRating(1250.0, 100.0, 0.06));

        Submission sub1 = Submission.builder()
                .id(100L)
                .user(testUser)
                .problem(testProblem)
                .verdict("Wrong Answer")
                .submittedAt(LocalDateTime.now().minusMinutes(5))
                .build();

        Submission sub2 = Submission.builder()
                .id(101L)
                .user(testUser)
                .problem(testProblem)
                .verdict("Accepted")
                .submittedAt(LocalDateTime.now())
                .build();

        List<Submission> subs = Arrays.asList(sub1, sub2);
        when(submissionRepository.findByUserId(1L)).thenReturn(subs);
        when(submissionRepository.findByUserIdAndProblemId(1L, 10L)).thenReturn(subs);
        when(submissionRepository.findByUserIdAndTag(1L, "Array")).thenReturn(subs);

        TopicRating tr = TopicRating.builder().user(testUser).tag("Array").eloRating(1200).peakRating(1200).problemsPlayed(0).build();
        when(topicRatingRepository.findByUserIdAndTag(1L, "Array")).thenReturn(Optional.of(tr));
        when(topicRatingRepository.save(any(TopicRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        topicRatingService.updateIncremental(1L, sub2);

        assertEquals(1, tr.getProblemsPlayed());
        assertEquals(1250, tr.getEloRating());

        reset(topicRatingRepository);
        when(topicRatingRepository.findByUserId(1L)).thenReturn(Collections.singletonList(tr));
        when(topicRatingRepository.findByUserIdAndTag(1L, "Array")).thenReturn(Optional.of(tr));
        when(topicRatingRepository.save(any(TopicRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        topicRatingService.recomputeElo(1L);

        assertEquals(1, tr.getProblemsPlayed());
        assertEquals(1250, tr.getEloRating());
    }

    @Test
    void testMonthlyBatching_bundlesMatchesInSameMonthIntoSingleRatingPeriod() {
        when(glickoEngine.updateRating(any(), any())).thenReturn(
            new Glicko2MasteryEngine.GlickoRating(1550.0, 250.0, 0.06));

        Problem p1 = Problem.builder().id(10L).titleSlug("problem-1").tags(List.of("DP")).actualRating(1400.0).build();
        Problem p2 = Problem.builder().id(20L).titleSlug("problem-2").tags(List.of("DP")).actualRating(1600.0).build();

        LocalDateTime sameMonth = LocalDateTime.of(2026, 3, 15, 10, 0);

        Submission sub1 = Submission.builder()
                .id(1L)
                .user(testUser)
                .problem(p1)
                .verdict("Accepted")
                .submittedAt(sameMonth)
                .build();

        Submission sub2 = Submission.builder()
                .id(2L)
                .user(testUser)
                .problem(p2)
                .verdict("Accepted")
                .submittedAt(sameMonth.plusDays(2))
                .build();

        when(submissionRepository.findByUserIdAndTag(1L, "DP")).thenReturn(List.of(sub1, sub2));
        TopicRating tr = TopicRating.builder().user(testUser).tag("DP").eloRating(1500).peakRating(1500).problemsPlayed(0).build();
        when(topicRatingRepository.findByUserIdAndTag(1L, "DP")).thenReturn(Optional.of(tr));
        when(topicRatingRepository.save(any(TopicRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        topicRatingService.recomputeEloForTag(testUser, "DP");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Glicko2MasteryEngine.MatchResult>> matchCaptor = ArgumentCaptor.forClass(List.class);
        verify(glickoEngine, times(1)).updateRating(any(), matchCaptor.capture());

        List<Glicko2MasteryEngine.MatchResult> capturedMatches = matchCaptor.getValue();
        assertEquals(2, capturedMatches.size(), "Two problems solved in the same month must be batched together in 1 rating period");
    }
}
