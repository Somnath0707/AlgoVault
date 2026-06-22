package com.algovault.engine;

import com.algovault.model.Problem;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SimilarityEngine {

    public List<Problem> findSimilar(Problem target, List<Problem> solvedProblems, int limit) {
        if (target.getTags() == null || target.getTags().isEmpty()) {
            return solvedProblems.stream().limit(limit).collect(Collectors.toList());
        }

        return solvedProblems.stream()
            .filter(p -> p.getActualRating() != null && target.getActualRating() != null)
            .sorted((p1, p2) -> {
                double score1 = calculateSimilarity(target, p1);
                double score2 = calculateSimilarity(target, p2);
                return Double.compare(score2, score1);
            })
            .limit(limit)
            .collect(Collectors.toList());
    }

    private double calculateSimilarity(Problem p1, Problem p2) {
        if (p1.getTags() == null || p2.getTags() == null) return 0;
        
        long intersectionCount = p1.getTags().stream().filter(p2.getTags()::contains).count();
        if (intersectionCount == 0) return 0;

        long unionCount = p1.getTags().size() + p2.getTags().size() - intersectionCount;
        double tagOverlap = (double) intersectionCount / unionCount;

        double ratingProximity = 1.0;
        if (p1.getActualRating() != null && p2.getActualRating() != null) {
            double ratingDiff = Math.abs(p1.getActualRating() - p2.getActualRating());
            ratingProximity = 1.0 - Math.min(ratingDiff / 500.0, 1.0);
        }

        return (tagOverlap * 0.6) + (ratingProximity * 0.4);
    }
}
