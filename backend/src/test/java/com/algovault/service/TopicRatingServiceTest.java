package com.algovault.service;

import com.algovault.engine.EloEngine;
import com.algovault.model.*;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TopicRatingRepository;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
    private EloEngine eloEngine;

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
    }

    @Test
    void testEloRecomputeAndIncrementalAgreement() {
        when(eloEngine.calculateNewElo(anyInt(), anyInt(), anyDouble(), anyInt())).thenReturn(1250);

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

        TopicRating tr = TopicRating.builder().user(testUser).tag("Array").eloRating(1200).peakRating(1200).problemsPlayed(0).build();
        when(topicRatingRepository.findByUserIdAndTag(1L, "Array")).thenReturn(Optional.of(tr));
        when(topicRatingRepository.save(any(TopicRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        topicRatingService.updateIncremental(1L, sub2);

        assertEquals(1, tr.getProblemsPlayed());
        assertEquals(1250, tr.getEloRating());

        reset(topicRatingRepository);
        when(topicRatingRepository.findByUserId(1L)).thenReturn(Collections.singletonList(tr));
        when(topicRatingRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        topicRatingService.recomputeElo(1L);

        assertEquals(1, tr.getProblemsPlayed());
        assertEquals(1250, tr.getEloRating());
    }
}
