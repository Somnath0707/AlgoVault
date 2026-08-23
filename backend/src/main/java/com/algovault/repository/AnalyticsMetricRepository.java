package com.algovault.repository;

import com.algovault.model.AnalyticsMetric;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
