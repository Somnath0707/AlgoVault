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
}
