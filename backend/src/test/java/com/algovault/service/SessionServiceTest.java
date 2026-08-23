package com.algovault.service;

import com.algovault.dto.SessionRequests;
import com.algovault.engine.SpacedRepetitionEngine;
import com.algovault.model.*;
import com.algovault.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private ProblemService problemService;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private ProblemOpenEventRepository problemOpenEventRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private RevisionCardRepository revisionCardRepository;

    @Mock
    private SyncMetadataRepository syncMetadataRepository;

    @Mock
    private AnalyticsService analyticsService;

    @Mock
    private AnalyticsMetricRepository analyticsMetricRepository;

    @Mock
    private ZenithSessionRepository zenithSessionRepository;

    @Mock
    private SpacedRepetitionEngine spacedRepetitionEngine;

    @InjectMocks
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void closeStaleSessions_closesOnlySessionsOlderThan12Hours() {
        User user = User.builder().id(1L).build();
        
        // 1. Session started 13 hours ago (stale)
        Session staleSession = Session.builder()
                .id(101L)
                .user(user)
                .startedAt(LocalDateTime.now().minusHours(13))
                .endedAt(null)
                .build();

        // 2. Session started 2 hours ago (fresh)
        Session freshSession = Session.builder()
                .id(102L)
                .user(user)
                .startedAt(LocalDateTime.now().minusHours(2))
                .endedAt(null)
                .build();

        when(sessionRepository.findByEndedAtIsNull()).thenReturn(Arrays.asList(staleSession, freshSession));

        sessionService.closeStaleSessions();

        // Stale session should be closed and saved
        assertNotNull(staleSession.getEndedAt());
        assertEquals(staleSession.getStartedAt().plusHours(1), staleSession.getEndedAt());
        verify(sessionRepository, times(1)).save(staleSession);

        // Fresh session should remain open
        assertNull(freshSession.getEndedAt());
        verify(sessionRepository, never()).save(freshSession);
    }

    @Test
    void heartbeat_accumulatesCorrectlyAcrossEpochs() {
        User user = User.builder().id(1L).build();
        Session session = Session.builder()
                .id(200L)
                .user(user)
                .mode("PRACTICE")
                .startedAt(LocalDateTime.now())
                .focusSeconds(0)
                .tabSwitches(0)
                .pasteCount(0)
                .accumulatedFocusSeconds(0)
                .accumulatedTabSwitches(0)
                .accumulatedPasteCount(0)
                .build();

        when(sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(1L))
                .thenReturn(Optional.of(session));
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Heartbeat 1 (Epoch 1, 300s focus)
        SessionRequests.HeartbeatRequest req1 = new SessionRequests.HeartbeatRequest();
        req1.setHeartbeatEpoch("epoch-1");
        req1.setFocusSeconds(300);
        req1.setTabSwitches(2);
        req1.setPasteCount(1);

        sessionService.heartbeat(user, req1);

        assertEquals(300, session.getFocusSeconds());
        assertEquals("epoch-1", session.getLastHeartbeatEpoch());

        // 2. Simulated crash/restart (Epoch 2, starts at 50s focus)
        SessionRequests.HeartbeatRequest req2 = new SessionRequests.HeartbeatRequest();
        req2.setHeartbeatEpoch("epoch-2");
        req2.setFocusSeconds(50);
        req2.setTabSwitches(1);
        req2.setPasteCount(0);

        sessionService.heartbeat(user, req2);

        // Assert total focus time is 350s (300s + 50s), tab switches is 3, paste count is 1
        assertEquals(350, session.getFocusSeconds());
        assertEquals(3, session.getTabSwitches());
        assertEquals(1, session.getPasteCount());
        assertEquals("epoch-2", session.getLastHeartbeatEpoch());
    }

    @Test
    void heartbeat_withoutExplicitSession_doesNotCreateOne() {
        User user = User.builder().id(1L).build();
        SessionRequests.HeartbeatRequest request = new SessionRequests.HeartbeatRequest();
        request.setFocusSeconds(120);

        when(sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(1L))
            .thenReturn(Optional.empty());

        assertNull(sessionService.heartbeat(user, request));
        verify(sessionRepository, never()).save(any(Session.class));
    }

    @Test
    void recordSubmission_accepted_createsRevisionCardIfNoneExists() {
        User user = User.builder().id(1L).build();
        Problem problem = Problem.builder().id(10L).titleSlug("two-sum").title("Two Sum").build();
        when(problemService.getOrCreate("two-sum", "Two Sum")).thenReturn(problem);

        SessionRequests.SubmissionResultRequest request = new SessionRequests.SubmissionResultRequest();
        request.setTitleSlug("two-sum");
        request.setTitle("Two Sum");
        request.setStatusDisplay("Accepted");
        request.setIsReview(false);

        when(problemOpenEventRepository.findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(1L, 10L))
                .thenReturn(Optional.of(ProblemOpenEvent.builder().user(user).problem(problem).build()));
        when(revisionCardRepository.findByUserIdAndProblemId(1L, 10L)).thenReturn(Optional.empty());

        sessionService.recordSubmission(user, request);

        verify(revisionCardRepository, times(1)).save(any(RevisionCard.class));
        verify(spacedRepetitionEngine, never()).updateCard(any(), anyInt(), anyDouble(), anyBoolean());
    }

    @Test
    void recordSubmission_accepted_withoutIsReview_doesNotAdvanceExistingRevisionCard() {
        User user = User.builder().id(1L).build();
        Problem problem = Problem.builder().id(10L).titleSlug("two-sum").title("Two Sum").build();
        when(problemService.getOrCreate("two-sum", "Two Sum")).thenReturn(problem);

        RevisionCard existingCard = RevisionCard.builder()
                .id(99L)
                .user(user)
                .problem(problem)
                .stability(5.0)
                .confidence(4)
                .build();

        SessionRequests.SubmissionResultRequest request = new SessionRequests.SubmissionResultRequest();
        request.setTitleSlug("two-sum");
        request.setTitle("Two Sum");
        request.setStatusDisplay("Accepted");
        request.setIsReview(false);

        when(problemOpenEventRepository.findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(1L, 10L))
                .thenReturn(Optional.of(ProblemOpenEvent.builder().user(user).problem(problem).build()));
        when(revisionCardRepository.findByUserIdAndProblemId(1L, 10L)).thenReturn(Optional.of(existingCard));

        sessionService.recordSubmission(user, request);

        verify(spacedRepetitionEngine, never()).updateCard(any(), anyInt(), anyDouble(), anyBoolean());
        verify(revisionCardRepository, never()).save(existingCard);
    }

    @Test
    void recordSubmission_accepted_withIsReview_advancesExistingRevisionCard() {
        User user = User.builder().id(1L).build();
        Problem problem = Problem.builder().id(10L).titleSlug("two-sum").title("Two Sum").build();
        when(problemService.getOrCreate("two-sum", "Two Sum")).thenReturn(problem);

        RevisionCard existingCard = RevisionCard.builder()
                .id(99L)
                .user(user)
                .problem(problem)
                .stability(5.0)
                .confidence(4)
                .build();

        SessionRequests.SubmissionResultRequest request = new SessionRequests.SubmissionResultRequest();
        request.setTitleSlug("two-sum");
        request.setTitle("Two Sum");
        request.setStatusDisplay("Accepted");
        request.setIsReview(true);

        when(problemOpenEventRepository.findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(1L, 10L))
                .thenReturn(Optional.of(ProblemOpenEvent.builder().user(user).problem(problem).build()));
        when(revisionCardRepository.findByUserIdAndProblemId(1L, 10L)).thenReturn(Optional.of(existingCard));

        sessionService.recordSubmission(user, request);

        verify(spacedRepetitionEngine, times(1)).updateCard(eq(existingCard), eq(4), eq(1.0), eq(false));
        verify(revisionCardRepository, times(1)).save(existingCard);
    }
}
