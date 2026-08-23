package com.algovault.service;

import com.algovault.dto.PredictionResponse;
import com.algovault.engine.SolveProbabilityEngine;
import com.algovault.model.AnalyticsMetric;
import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.repository.AnalyticsMetricRepository;
import com.algovault.repository.ContestResultRepository;
import com.algovault.repository.ProblemOpenEventRepository;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SolveProbabilityService {
    private final SolveProbabilityEngine engine;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final TagMasteryRepository tagMasteryRepository;
    private final ContestResultRepository contestResultRepository;
    private final ProblemOpenEventRepository problemOpenEventRepository;
    private final ProblemService problemService;
    private final AnalyticsMetricRepository analyticsMetricRepository;

    @Transactional
    @Cacheable(value = "predictions", key = "#userId + '-' + #titleSlug")
    public PredictionResponse predict(Long userId, String titleSlug) {
        User user = userRepository.findById(userId).orElseThrow();
        Problem problem = problemService.getOrCreate(titleSlug, null);
        
        List<Submission> submissions = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        List<com.algovault.model.ContestResult> contestResults = contestResultRepository.findByUserIdOrderByContestDateDesc(userId);
        List<com.algovault.model.ProblemOpenEvent> openEvents = problemOpenEventRepository.findByUserId(userId);
        
        PredictionResponse response = engine.predict(user, problem, submissions, masteries, contestResults, openEvents);

        if (response != null && !Boolean.TRUE.equals(response.getInsufficientData()) && problem.getId() != null) {
            boolean alreadyPending = analyticsMetricRepository.existsByUserIdAndProblemIdAndActualResultIsNull(userId, problem.getId());
            if (!alreadyPending) {
                try {
                    analyticsMetricRepository.saveAndFlush(AnalyticsMetric.builder()
                        .user(user)
                        .problem(problem)
                        .predictedProbability((double) response.getSolveChance())
                        .actualResult(null)
                        .problemRating(problem.getActualRating())
                        .tags(problem.getTags() != null ? String.join(",", problem.getTags()) : "")
                        .confidence(response.getConfidence())
                        .build());
                } catch (DataIntegrityViolationException e) {
                    log.debug("Concurrent prediction metric already saved for user {} and problem {}", userId, problem.getId());
                }
            }
        }

        return response;
    }
}
