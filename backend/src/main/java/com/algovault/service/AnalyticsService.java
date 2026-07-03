package com.algovault.service;
import com.algovault.model.Submission;
import com.algovault.model.ProblemOpenEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {
    private final MasteryService masteryService;
    private final TopicRatingService topicRatingService;
    private final HeatmapService heatmapService;

    public void recomputeAll(Long userId) {
        log.info("Recomputing analytics for user ID: {}", userId);
        recomputeMastery(userId);
        recomputeTopicRatings(userId);
        recomputeRatingBuckets(userId);
        log.info("Analytics recomputation completed for user ID: {}", userId);
    }
    
    public void recomputeMastery(Long userId) {
        masteryService.computeMastery(userId);
    }
    
    public void recomputeTopicRatings(Long userId) {
        topicRatingService.recomputeElo(userId);
    }
    
    public void recomputeRatingBuckets(Long userId) {
        heatmapService.recomputeHeatmap(userId);
    }

    public void updateIncremental(Long userId, Submission submission) {
        log.info("Incremental update of analytics for user: {}, submission: {}", userId, submission.getId());
        masteryService.updateIncremental(userId, submission);
        topicRatingService.updateIncremental(userId, submission);
        heatmapService.updateIncremental(userId, submission);
    }

    public void updateIncremental(Long userId, ProblemOpenEvent event) {
        log.info("Incremental update of analytics for user: {}, event: {}", userId, event.getId());
        masteryService.updateIncremental(userId, event);
    }
}
