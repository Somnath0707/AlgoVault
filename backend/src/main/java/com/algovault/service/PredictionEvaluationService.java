package com.algovault.service;

import com.algovault.dto.PredictionEvaluationResponse;
import com.algovault.model.AnalyticsMetric;
import com.algovault.repository.AnalyticsMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class PredictionEvaluationService {
    private final AnalyticsMetricRepository repository;

    @Transactional(readOnly = true)
    public PredictionEvaluationResponse getEvaluation(Long userId) {
        List<AnalyticsMetric> resolvedMetrics = repository.findByUserIdAndActualResultIsNotNull(userId);

        if (resolvedMetrics == null || resolvedMetrics.isEmpty()) {
            return PredictionEvaluationResponse.builder()
                .totalResolved(0)
                .accuracyPercent(0.0)
                .brierScore(0.0)
                .build();
        }

        double totalBrierScore = 0.0;
        int correctPredictions = 0;

        for (AnalyticsMetric metric : resolvedMetrics) {
            double actual = Boolean.TRUE.equals(metric.getActualResult()) ? 1.0 : 0.0;
            double rawProb = (metric.getPredictedProbability() != null && Double.isFinite(metric.getPredictedProbability()))
                    ? (metric.getPredictedProbability() / 100.0)
                    : 0.5;
            double predicted = Math.max(0.0, Math.min(1.0, rawProb));

            totalBrierScore += Math.pow(predicted - actual, 2);

            if ((predicted >= 0.5 && actual == 1.0) || (predicted < 0.5 && actual == 0.0)) {
                correctPredictions++;
            }
        }

        double meanBrierScore = totalBrierScore / resolvedMetrics.size();
        double accuracy = (double) correctPredictions / resolvedMetrics.size();

        return PredictionEvaluationResponse.builder()
            .totalResolved(resolvedMetrics.size())
            .accuracyPercent(Math.round(accuracy * 1000.0) / 10.0)
            .brierScore(Math.round(meanBrierScore * 10000.0) / 10000.0)
            .build();
    }
}
