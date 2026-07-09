package com.algovault.service;

import com.algovault.model.AnalyticsMetric;
import com.algovault.repository.AnalyticsMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.algovault.dto.PredictionEvaluationResponse;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
@Slf4j
public class PredictionEvaluationService {
    private final AnalyticsMetricRepository repository;

    public PredictionEvaluationResponse getEvaluation(Long userId) {
        List<AnalyticsMetric> resolvedMetrics = repository.findByUserIdAndActualResultIsNotNull(userId);

        if (resolvedMetrics.isEmpty()) {
            return PredictionEvaluationResponse.builder()
                .totalResolved(0)
                .accuracyPercent(0.0)
                .brierScore(0.0)
                .build();
        }

        double totalBrierScore = 0;
        int correctPredictions = 0;

        for (AnalyticsMetric metric : resolvedMetrics) {
            double actual = metric.getActualResult() ? 1.0 : 0.0;
            double predicted = metric.getPredictedProbability() / 100.0;
            
            totalBrierScore += Math.pow(predicted - actual, 2);
            
            if ((predicted >= 0.5 && actual == 1.0) || (predicted < 0.5 && actual == 0.0)) {
                correctPredictions++;
            }
        }

        double meanBrierScore = totalBrierScore / resolvedMetrics.size();
        double accuracy = (double) correctPredictions / resolvedMetrics.size();

        return PredictionEvaluationResponse.builder()
            .totalResolved(resolvedMetrics.size())
            .accuracyPercent(accuracy * 100.0)
            .brierScore(meanBrierScore)
            .build();
    }
}
