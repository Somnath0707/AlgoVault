package com.algovault.service;

import com.algovault.engine.Glicko2MasteryEngine;
import com.algovault.model.*;
import com.algovault.repository.ProblemOpenEventRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
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

class MasteryServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private TagMasteryRepository tagMasteryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProblemOpenEventRepository problemOpenEventRepository;

    @Mock
    private Glicko2MasteryEngine glickoEngine;

    @InjectMocks
    private MasteryService masteryService;

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
    void testRecomputeAndIncrementalAgreement() {
        Glicko2MasteryEngine.GlickoRating mockRating = new Glicko2MasteryEngine.GlickoRating(1500.0, 100.0, 0.06);
        when(glickoEngine.updateRating(any(), any())).thenReturn(mockRating);

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
        when(submissionRepository.findByUserIdOrderBySubmittedAtDesc(1L)).thenReturn(subs);
        when(submissionRepository.findByUserId(1L)).thenReturn(subs);
        when(submissionRepository.findByUserIdAndProblemId(1L, 10L)).thenReturn(subs);

        TagMastery tagMastery = TagMastery.builder().user(testUser).tag("Array").build();
        when(tagMasteryRepository.findByUserIdAndTag(1L, "Array")).thenReturn(Optional.of(tagMastery));
        when(tagMasteryRepository.save(any(TagMastery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        masteryService.updateIncremental(1L, sub2);

        assertEquals(1, tagMastery.getTotalAttempted());
        assertEquals(1, tagMastery.getTotalSolved());
        assertEquals(0, tagMastery.getFirstAcCount());

        reset(tagMasteryRepository);
        when(tagMasteryRepository.findByUserIdAndTag(1L, "Array")).thenReturn(Optional.of(tagMastery));
        when(tagMasteryRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        masteryService.computeMastery(1L);

        assertEquals(1, tagMastery.getTotalAttempted());
        assertEquals(1, tagMastery.getTotalSolved());
        assertEquals(0, tagMastery.getFirstAcCount());
    }
}
