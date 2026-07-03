package com.algovault.service;

import com.algovault.model.Session;
import com.algovault.model.User;
import com.algovault.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;

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

    @Mock
    private ProblemService problemService;

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
                .thenReturn(java.util.Optional.of(session));
        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Heartbeat 1 (Epoch 1, 300s focus)
        com.algovault.dto.SessionRequests.HeartbeatRequest req1 = new com.algovault.dto.SessionRequests.HeartbeatRequest();
        req1.setHeartbeatEpoch("epoch-1");
        req1.setFocusSeconds(300);
        req1.setTabSwitches(2);
        req1.setPasteCount(1);

        sessionService.heartbeat(user, req1);

        assertEquals(300, session.getFocusSeconds());
        assertEquals("epoch-1", session.getLastHeartbeatEpoch());

        // 2. Simulated crash/restart (Epoch 2, starts at 50s focus)
        com.algovault.dto.SessionRequests.HeartbeatRequest req2 = new com.algovault.dto.SessionRequests.HeartbeatRequest();
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
}
