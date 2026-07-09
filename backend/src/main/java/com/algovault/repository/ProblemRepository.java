package com.algovault.repository;

import com.algovault.model.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Optional<Problem> findByTitleSlug(String titleSlug);
    List<Problem> findByTitleSlugIn(List<String> slugs);

    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE :tag = ANY(p.tags)
          AND p.actual_rating BETWEEN :minRating AND :maxRating
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY RANDOM()
        LIMIT :limit
        """, nativeQuery = true)
    List<Problem> findRecommendedUnsolved(
        @Param("userId") Long userId,
        @Param("tag") String tag,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating,
        @Param("limit") int limit
    );

    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE p.actual_rating BETWEEN :minRating AND :maxRating
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY RANDOM()
        LIMIT 1
        """, nativeQuery = true)
    Optional<Problem> findUnsolvedByRating(
        @Param("userId") Long userId,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating
    );
}
