package com.algovault.engine;

import com.algovault.dto.PredictionResponse;
import com.algovault.model.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SolveProbabilityEngineTest {

    private final SolveProbabilityEngine engine = new SolveProbabilityEngine();

    @Test
    void predict_withoutProblemRating_returnsDefaultLowConfidence() {
        User user = User.builder().id(1L).virtualRating(1600).build();
        Problem problem = Problem.builder().id(10L).titleSlug("unrated-problem").actualRating(null).build();

        PredictionResponse response = engine.predict(user, problem, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), Collections.emptyList());

        assertNotNull(response);
        assertEquals(50, response.getSolveChance());
        assertEquals("LOW", response.getConfidence());
        assertTrue(response.getInsufficientData());
    }

    @Test
    void predict_confidenceRequiresSufficientEffectiveWeight() {
        User user = User.builder().id(1L).virtualRating(1600).build();
        Problem targetProblem = Problem.builder().id(100L).titleSlug("target").actualRating(1600.0).build();

        // Scenario A: 20 problems at extreme boundary (diff = 95, w ~ 0.16)
        // rawObservations = 20, but totalWeight = 20 * 0.16 = 3.2 < 5.0 -> Confidence must be LOW
        List<Submission> boundarySubs = new ArrayList<>();
        for (long i = 1; i <= 20; i++) {
            Problem p = Problem.builder().id(i).actualRating(1600.0 + 95.0).build();
            boundarySubs.add(Submission.builder().id(i).problem(p).verdict("Accepted").submittedAt(LocalDateTime.now()).build());
        }

        PredictionResponse responseBoundary = engine.predict(user, targetProblem, boundarySubs, Collections.emptyList(), Collections.emptyList(), Collections.emptyList());

        assertNotNull(responseBoundary);
        assertEquals("LOW", responseBoundary.getConfidence(), "Boundary problems with low total weight must be LOW confidence");

        // Scenario B: 20 problems at exact rating (diff = 0, w = 1.0)
        // rawObservations = 20, totalWeight = 20.0 >= 12.0 -> Confidence must be HIGH
        List<Submission> exactSubs = new ArrayList<>();
        for (long i = 1; i <= 20; i++) {
            Problem p = Problem.builder().id(i).actualRating(1600.0).build();
            exactSubs.add(Submission.builder().id(i).problem(p).verdict("Accepted").submittedAt(LocalDateTime.now()).build());
        }

        PredictionResponse responseExact = engine.predict(user, targetProblem, exactSubs, Collections.emptyList(), Collections.emptyList(), Collections.emptyList());

        assertNotNull(responseExact);
        assertEquals("HIGH", responseExact.getConfidence(), "Exact match problems with high total weight must be HIGH confidence");
        assertFalse(responseExact.getInsufficientData());
    }

    @Test
    void predict_expectedTimeMinutes_calculatesAccurateMedianFromDoubleSeconds() {
        User user = User.builder().id(1L).virtualRating(1600).build();
        Problem targetProblem = Problem.builder().id(100L).titleSlug("target").actualRating(1600.0).build();

        Problem comp1 = Problem.builder().id(101L).actualRating(1590.0).build();
        Problem comp2 = Problem.builder().id(102L).actualRating(1600.0).build();
        Problem comp3 = Problem.builder().id(103L).actualRating(1610.0).build();

        List<ProblemOpenEvent> openEvents = List.of(
            ProblemOpenEvent.builder().problem(comp1).focusSeconds(300).solved(true).build(),   // 5 min
            ProblemOpenEvent.builder().problem(comp2).focusSeconds(900).solved(true).build(),   // 15 min
            ProblemOpenEvent.builder().problem(comp3).focusSeconds(1500).solved(true).build()  // 25 min
        );

        PredictionResponse response = engine.predict(user, targetProblem, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), openEvents);

        assertNotNull(response);
        assertEquals(15, response.getExpectedTimeMinutes(), "Median of 5, 15, 25 minutes must be 15");
    }
}
