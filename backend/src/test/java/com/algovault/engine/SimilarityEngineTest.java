package com.algovault.engine;

import com.algovault.model.Problem;
import org.junit.jupiter.api.Test;
import java.util.Arrays;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class SimilarityEngineTest {

    private final SimilarityEngine engine = new SimilarityEngine();

    @Test
    void findSimilar_calculatesSimilarityCorrectly() {
        Problem target = Problem.builder()
            .title("Problem A")
            .tags(Arrays.asList("DP", "String"))
            .actualRating(1600.0)
            .build();

        Problem similarProblem = Problem.builder()
            .title("Problem B")
            .tags(Arrays.asList("DP", "String"))
            .actualRating(1650.0)
            .build();

        Problem dissimilarProblem = Problem.builder()
            .title("Problem C")
            .tags(Arrays.asList("Graph"))
            .actualRating(2100.0)
            .build();

        List<Problem> solved = Arrays.asList(dissimilarProblem, similarProblem);
        List<Problem> recommendations = engine.findSimilar(target, solved, 2);

        assertEquals(2, recommendations.size());
        assertEquals("Problem B", recommendations.get(0).getTitle()); // Most similar should rank first
    }
}
