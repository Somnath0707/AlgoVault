package com.algovault.service;

import com.algovault.dto.DashboardResponse;
import com.algovault.model.Submission;
import com.algovault.model.SyncMetadata;
import com.algovault.model.User;
import com.algovault.repository.SessionRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.SyncMetadataRepository;
import com.algovault.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class DashboardServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SyncMetadataRepository syncMetadataRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getDashboard_usesOptimizedQueriesAndAvoidsFullTableScan() {
        Long userId = 1L;
        User user = User.builder().id(userId).virtualRating(1500).build();
        SyncMetadata meta = SyncMetadata.builder().lastSyncTime(LocalDateTime.now()).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(syncMetadataRepository.findByUserId(userId)).thenReturn(Optional.of(meta));
        
        // Mock optimized repository calls
        when(submissionRepository.findTop5ByUserIdAndVerdictOrderBySubmittedAtDesc(eq(userId), eq("Accepted")))
                .thenReturn(new ArrayList<>());
        when(submissionRepository.countSubmissionsSince(eq(userId), any(LocalDateTime.class)))
                .thenReturn(15L);
        when(submissionRepository.countDistinctSolvedProblemsSince(eq(userId), any(LocalDateTime.class)))
                .thenReturn(3L);
        when(submissionRepository.findAcceptedDatesDesc(eq(userId)))
                .thenReturn(new ArrayList<>());
        when(sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(userId))
                .thenReturn(Optional.empty());

        DashboardResponse response = dashboardService.getDashboard(userId);

        assertNotNull(response);
        assertEquals(15, response.getTodaySubmissions());
        assertEquals(3, response.getTodaySolves());

        // Verify that the full-scan findByUserId list query is NEVER called in DashboardService.getDashboard()
        verify(submissionRepository, never()).findByUserId(anyLong());
        verify(submissionRepository, never()).findByUserIdOrderBySubmittedAtDesc(anyLong());

        // Verify optimized repository query counts are used instead
        verify(submissionRepository, times(1)).findTop5ByUserIdAndVerdictOrderBySubmittedAtDesc(eq(userId), eq("Accepted"));
        verify(submissionRepository, times(1)).countSubmissionsSince(eq(userId), any(LocalDateTime.class));
        verify(submissionRepository, times(1)).countDistinctSolvedProblemsSince(eq(userId), any(LocalDateTime.class));
        verify(submissionRepository, times(1)).findAcceptedDatesDesc(eq(userId));
    }
}
