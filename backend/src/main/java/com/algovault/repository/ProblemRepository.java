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

    /**
     * Recommends unsolved problems for a tag, using actual_rating where available
     * and falling back to difficulty-based estimates for unrated problems.
     * COALESCE maps: Easy→1250, Medium→1550, Hard→1950, default→1500.
     */
    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE :tag = ANY(p.tags)
          AND COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) BETWEEN :minRating AND :maxRating
          AND (p.is_premium IS NULL OR p.is_premium = false)
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY ABS(COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) - :targetRating) ASC, p.acceptance_rate DESC NULLS LAST, p.frontend_id ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Problem> findRecommendedUnsolved(
        @Param("userId") Long userId,
        @Param("tag") String tag,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating,
        @Param("targetRating") Double targetRating,
        @Param("limit") int limit
    );

    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE p.tags && CAST(:tags AS text[])
          AND COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) BETWEEN :minRating AND :maxRating
          AND (p.is_premium IS NULL OR p.is_premium = false)
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY ABS(COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) - :targetRating) ASC, p.acceptance_rate DESC NULLS LAST, p.frontend_id ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Problem> findRecommendedUnsolvedByTags(
        @Param("userId") Long userId,
        @Param("tags") String[] tags,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating,
        @Param("targetRating") Double targetRating,
        @Param("limit") int limit
    );

    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) BETWEEN :minRating AND :maxRating
          AND (p.is_premium IS NULL OR p.is_premium = false)
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY ABS(COALESCE(p.actual_rating,
              CASE LOWER(p.difficulty)
                  WHEN 'easy' THEN 1250
                  WHEN 'medium' THEN 1550
                  WHEN 'hard' THEN 1950
                  ELSE 1500
              END) - :targetRating) ASC, p.acceptance_rate DESC NULLS LAST, p.frontend_id ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Problem> findUnsolvedByRatingBand(
        @Param("userId") Long userId,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating,
        @Param("targetRating") Double targetRating,
        @Param("limit") int limit
    );

    @Query(value = """
        SELECT p.*
        FROM problems p
        WHERE p.actual_rating BETWEEN :minRating AND :maxRating
          AND (p.is_premium IS NULL OR p.is_premium = false)
          AND NOT EXISTS (
              SELECT 1 FROM submissions s
              WHERE s.problem_id = p.id
                AND s.user_id = :userId
                AND s.verdict = 'Accepted'
          )
        ORDER BY random()
        LIMIT 1
        """, nativeQuery = true)
    Optional<Problem> findUnsolvedByRating(
        @Param("userId") Long userId,
        @Param("minRating") Double minRating,
        @Param("maxRating") Double maxRating
    );
}
