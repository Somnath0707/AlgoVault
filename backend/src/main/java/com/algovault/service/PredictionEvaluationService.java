package com.algovault.service;

import com.algovault.model.AnalyticsMetric;
import com.algovault.repository.AnalyticsMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionEvaluationService {
    private final AnalyticsMetricRepository repository;

    public void evaluateMetrics() {
        List<AnalyticsMetric> resolvedMetrics = repository.findByActualResultIsNotNull();
        if (resolvedMetrics.isEmpty()) {
            log.info("No resolved predictions to evaluate.");
            return;
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

        log.info("Prediction Evaluation:");
        log.info("Total Resolved: {}", resolvedMetrics.size());
        log.info("Accuracy: {}%", String.format("%.2f", accuracy * 100));
        log.info("Brier Score: {}", String.format("%.4f", meanBrierScore)); // Lower is better (0 to 1)
    }
}
