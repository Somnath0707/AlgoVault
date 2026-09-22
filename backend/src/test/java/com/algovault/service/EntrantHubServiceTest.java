package com.algovault.service;

import com.algovault.dto.ContestPredictionRequest;
import com.algovault.dto.ContestPredictionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EntrantHubServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private EntrantHubService entrantHubService;

    @BeforeEach
    void setUp() {
        entrantHubService = new EntrantHubService(restTemplate);
    }

    @Test
    void predictContest_withEntrantHubSuccess_returnsPredictedResponse() {
        Map<String, Object> userItem = Map.of(
                "userSlug", "tiger2005",
                "rank", 4,
                "oldRating", 3559.4,
                "newRating", 3584.66,
                "deltaRating", 25.26
        );
        Map<String, Object> body = Map.of("items", List.of(userItem));

        when(restTemplate.exchange(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.eq(HttpMethod.GET),
                ArgumentMatchers.any(HttpEntity.class),
                ArgumentMatchers.eq(Map.class)
        )).thenReturn(new ResponseEntity<>(body, HttpStatus.OK));

        ContestPredictionRequest req = ContestPredictionRequest.builder()
                .contestSlug("weekly-contest-410")
                .contestTitle("Weekly Contest 410")
                .username("tiger2005")
                .rank(4)
                .solved(4)
                .totalQuestions(4)
                .currentRating(3559.4)
                .build();

        ContestPredictionResponse res = entrantHubService.predictContest(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("PREDICTED");
        assertThat(res.getSource()).isEqualTo("ENTRANTHUB");
        assertThat(res.getPredictedRating()).isEqualTo(3584.7);
        assertThat(res.getPredictedDelta()).isEqualTo(25.3);
        assertThat(res.getRank()).isEqualTo(4);
    }

    @Test
    void predictContest_whenEntrantHubFails_returnsFallbackPrediction() {
        when(restTemplate.exchange(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.eq(HttpMethod.GET),
                ArgumentMatchers.any(HttpEntity.class),
                ArgumentMatchers.eq(Map.class)
        )).thenThrow(new RuntimeException("Network error"));

        ContestPredictionRequest req = ContestPredictionRequest.builder()
                .contestSlug("weekly-contest-510")
                .contestTitle("Weekly Contest 510")
                .username("Som_07")
                .rank(1799)
                .solved(3)
                .totalQuestions(4)
                .currentRating(1950.3)
                .attendedContestsCount(35)
                .build();

        ContestPredictionResponse res = entrantHubService.predictContest(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("PREDICTION_PENDING");
        assertThat(res.getSource()).isEqualTo("FALLBACK");
        assertThat(res.getPredictedDelta()).isNotNull();
        assertThat(res.getPredictedRating()).isNotNull();
        assertThat(res.getPredictedDelta()).isGreaterThan(0.0);
    }

    @Test
    void predictContest_whenNotParticipated_returnsUnratedResponse() {
        when(restTemplate.exchange(
                ArgumentMatchers.anyString(),
                ArgumentMatchers.eq(HttpMethod.GET),
                ArgumentMatchers.any(HttpEntity.class),
                ArgumentMatchers.eq(Map.class)
        )).thenThrow(new RuntimeException("Not in EntrantHub"));

        ContestPredictionRequest req = ContestPredictionRequest.builder()
                .contestSlug("weekly-contest-517")
                .contestTitle("Weekly Contest 517")
                .username("Som_07")
                .rank(35793)
                .solved(0)
                .totalQuestions(4)
                .finishTimeMinutes(null)
                .currentRating(1966.1)
                .attendedContestsCount(35)
                .build();

        ContestPredictionResponse res = entrantHubService.predictContest(req);

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("UNRATED");
        assertThat(res.getSource()).isEqualTo("FALLBACK");
        assertThat(res.getPredictedDelta()).isEqualTo(0.0);
        assertThat(res.getPredictedRating()).isEqualTo(1966.1);
        assertThat(res.getRank()).isNull();
    }
}
