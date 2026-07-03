package com.algovault.service;

import com.algovault.dto.PredictionResponse;
import com.algovault.engine.SolveProbabilityEngine;
import com.algovault.model.Problem;
import com.algovault.model.Submission;
import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.repository.ProblemRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.TagMasteryRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import org.springframework.cache.annotation.Cacheable;

@Service
@RequiredArgsConstructor
public class SolveProbabilityService {
    private final SolveProbabilityEngine engine;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final TagMasteryRepository tagMasteryRepository;
    private final com.algovault.repository.ContestResultRepository contestResultRepository;
    private final com.algovault.repository.ProblemOpenEventRepository problemOpenEventRepository;

    @Cacheable(value = "predictions", key = "#userId + '-' + #titleSlug")
    public PredictionResponse predict(Long userId, String titleSlug) {
        User user = userRepository.findById(userId).orElseThrow();
        Problem problem = problemRepository.findByTitleSlug(titleSlug).orElseThrow(() -> new RuntimeException("Problem not found"));
        
        List<Submission> submissions = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);
        List<TagMastery> masteries = tagMasteryRepository.findByUserIdOrderByMasteryScoreDesc(userId);
        List<com.algovault.model.ContestResult> contestResults = contestResultRepository.findByUserIdOrderByContestDateDesc(userId);
        List<com.algovault.model.ProblemOpenEvent> openEvents = problemOpenEventRepository.findByUserId(userId);
        
        return engine.predict(user, problem, submissions, masteries, contestResults, openEvents);
    }
}
