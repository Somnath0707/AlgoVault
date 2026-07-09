package com.algovault.repository;
import com.algovault.model.AnalyticsMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AnalyticsMetricRepository extends JpaRepository<AnalyticsMetric, Long> {
    List<AnalyticsMetric> findByUserIdAndActualResultIsNull(Long userId);
    List<AnalyticsMetric> findByActualResultIsNotNull();
    List<AnalyticsMetric> findByUserIdAndActualResultIsNotNull(Long userId);
}
