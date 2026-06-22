package com.algovault.service;

import com.algovault.dto.ContestAnalysisResponse;
import com.algovault.model.ContestResult;
import com.algovault.repository.ContestResultRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

public class ContestAnalyzerServiceTest {

    @Mock
    private ContestResultRepository repository;

    @InjectMocks
    private ContestAnalyzerService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetContestHistory_ReturnsAnalysis() {
        ContestResult r1 = ContestResult.builder()
                .contestTitle("Weekly Contest 350")
                .contestDate(LocalDateTime.now())
                .rank(1500)
                .newRating(1800.0)
                .build();

        when(repository.findByUserIdOrderByContestDateDesc(1L)).thenReturn(Arrays.asList(r1));

        List<ContestAnalysisResponse> response = service.getContestHistory(1L);

        assertEquals(1, response.size());
        assertEquals("Weekly Contest 350", response.get(0).getContestTitle());
        assertEquals(1500, response.get(0).getRank());
        assertEquals("Low", response.get(0).getPanicIndex()); // rank < 10000 -> Low
    }
}
