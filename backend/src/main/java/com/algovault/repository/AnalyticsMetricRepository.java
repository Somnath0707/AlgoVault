package com.algovault.repository;

import com.algovault.model.AnalyticsMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnalyticsMetricRepository extends JpaRepository<AnalyticsMetric, Long> {
    List<AnalyticsMetric> findByUserIdAndActualResultIsNull(Long userId);
    List<AnalyticsMetric> findByActualResultIsNotNull();
    List<AnalyticsMetric> findByUserIdAndActualResultIsNotNull(Long userId);
    boolean existsByUserIdAndProblemIdAndActualResultIsNull(Long userId, Long problemId);
    Optional<AnalyticsMetric> findFirstByUserIdAndProblemIdAndActualResultIsNull(Long userId, Long problemId);

    @Modifying
    @Query(value = """
        INSERT INTO analytics_metrics (
            user_id, problem_id, predicted_probability,
            actual_result, problem_rating, tags, confidence
        )
        VALUES (
            :userId, :problemId, :probability,
            NULL, :rating, :tags, :confidence
        )
        ON CONFLICT (user_id, problem_id)
        WHERE actual_result IS NULL
        DO NOTHING
        """, nativeQuery = true)
    int insertPendingMetricIfAbsent(
        @Param("userId") Long userId,
        @Param("problemId") Long problemId,
        @Param("probability") double probability,
        @Param("rating") Double rating,
        @Param("tags") String tags,
        @Param("confidence") String confidence
    );
}
