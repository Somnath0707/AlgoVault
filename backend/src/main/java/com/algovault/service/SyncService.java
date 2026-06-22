package com.algovault.service;
import com.algovault.dto.SyncLeetcodeRequest;
import com.algovault.model.*;
import com.algovault.repository.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final ContestResultRepository contestResultRepository;
    private final SyncLogRepository syncLogRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final AnalyticsService analyticsService;
    private final AnalyticsMetricRepository analyticsMetricRepository;

    @Transactional
    @CacheEvict(value = {"dashboard", "heatmap", "mastery", "predictions", "potd", "contests", "weakness"}, allEntries = true)
    public void syncLeetcode(Long userId, SyncLeetcodeRequest request) {
        log.info("Starting sync for user ID: {}", userId);
        LocalDateTime startTime = LocalDateTime.now();
        
        SyncLog syncLog = SyncLog.builder()
            .user(User.builder().id(userId).build())
            .startedAt(startTime)
            .status("RUNNING")
            .newProblems(0)
            .newSubmissions(0)
            .newContests(0)
            .build();
        syncLog = syncLogRepository.save(syncLog);
        
        try {
            User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            
            if (request.getProfile() != null) {
                user.setLcUsername(request.getUsername());
                user.setAvatarUrl(request.getProfile().getUserAvatar());
            }
            if (request.getContestRanking() != null && request.getContestRanking().getRating() != null) {
                user.setLcRating(request.getContestRanking().getRating().intValue());
                if (user.getVirtualRating() == null) {
                    user.setVirtualRating(user.getLcRating());
                }
            }
            userRepository.save(user);

            Map<String, Problem> problemCache = new HashMap<>();
            
            int newProblems = 0;
            if (request.getSolvedProblems() != null) {
                for (SyncLeetcodeRequest.ProblemInfo pInfo : request.getSolvedProblems()) {
                    Problem problem = problemRepository.findByTitleSlug(pInfo.getTitleSlug()).orElse(null);
                    if (problem == null) {
                        problem = new Problem();
                        problem.setFrontendId(pInfo.getFrontendQuestionId());
                        problem.setTitle(pInfo.getTitle());
                        problem.setTitleSlug(pInfo.getTitleSlug());
                        problem.setDifficulty(pInfo.getDifficulty());
                        if (pInfo.getTopicTags() != null) {
                            problem.setTags(pInfo.getTopicTags().stream()
                                    .map(SyncLeetcodeRequest.TagInfo::getName)
                                    .collect(Collectors.toList()));
                        }
                        problem = problemRepository.save(problem);
                        newProblems++;
                    }
                    problemCache.put(problem.getTitleSlug(), problem);
                }
            }

            int newSubmissions = 0;
            if (request.getSubmissions() != null) {
                for (SyncLeetcodeRequest.SubmissionInfo sInfo : request.getSubmissions()) {
                    long timestampSeconds = Long.parseLong(sInfo.getTimestamp());
                    LocalDateTime submittedAt = LocalDateTime.ofInstant(Instant.ofEpochSecond(timestampSeconds), ZoneId.systemDefault());
                    
                    Problem problem = problemCache.get(sInfo.getTitleSlug());
                    if (problem == null) {
                        problem = problemRepository.findByTitleSlug(sInfo.getTitleSlug()).orElse(null);
                        if (problem != null) {
                            problemCache.put(sInfo.getTitleSlug(), problem);
                        }
                    }
                    
                    if (problem != null && sInfo.getStatusDisplay() != null && sInfo.getLang() != null) {
                        // Check if submission already exists by some logic if needed, 
                        // but since there's no unique constraint, we just insert.
                        // However, to prevent duplicates, we could check if a submission for this problem at this timestamp exists.
                        boolean exists = submissionRepository.existsByUserIdAndProblemIdAndSubmittedAt(user.getId(), problem.getId(), submittedAt);
                        
                        if (!exists) {
                            Submission sub = Submission.builder()
                                .user(user)
                                .problem(problem)
                                .verdict(sInfo.getStatusDisplay())
                                .language(sInfo.getLang())
                                .submittedAt(submittedAt)
                                .build();
                            
                            submissionRepository.save(sub);
                            newSubmissions++;
                        }
                    }
                }
            }

            
            // Resolve Analytics Metrics
            List<AnalyticsMetric> unresolvedMetrics = analyticsMetricRepository.findByUserIdAndActualResultIsNull(userId);
            for (AnalyticsMetric metric : unresolvedMetrics) {
                // Check if we just synced an AC submission for this problem
                boolean solvedNow = request.getSubmissions().stream()
                    .anyMatch(s -> s.getTitleSlug().equals(metric.getProblem().getTitleSlug()) && "Accepted".equals(s.getStatusDisplay()));
                
                if (solvedNow) {
                    metric.setActualResult(true);
                    metric.setResolvedAt(LocalDateTime.now());
                    analyticsMetricRepository.save(metric);
                } else {
                    // Check if they tried and failed
                    boolean failedNow = request.getSubmissions().stream()
                        .anyMatch(s -> s.getTitleSlug().equals(metric.getProblem().getTitleSlug()) && !"Accepted".equals(s.getStatusDisplay()));
                    if (failedNow) {
                        metric.setActualResult(false);
                        metric.setResolvedAt(LocalDateTime.now());
                        analyticsMetricRepository.save(metric);
                    }
                }
            }

            int newContests = 0;
            if (request.getContestHistory() != null) {
                for (SyncLeetcodeRequest.ContestHistoryInfo cInfo : request.getContestHistory()) {
                    if (cInfo.getAttended() != null && cInfo.getAttended()) {
                        String title = cInfo.getContest().getTitle();
                        if (!contestResultRepository.existsByUserIdAndContestTitle(userId, title)) {
                            LocalDateTime contestDate = LocalDateTime.ofInstant(Instant.ofEpochSecond(cInfo.getContest().getStartTime()), ZoneId.systemDefault());
                            ContestResult result = ContestResult.builder()
                                .user(user)
                                .contestTitle(title)
                                .contestDate(contestDate)
                                .rank(cInfo.getRanking())
                                .newRating(cInfo.getRating())
                                .build();
                            contestResultRepository.save(result);
                            newContests++;
                        }
                    }
                }
            }

            SyncMetadata metadata = syncMetadataRepository.findByUserId(userId).orElse(
                SyncMetadata.builder().user(user).build()
            );
            metadata.setLastSyncTime(LocalDateTime.now());
            if (request.getSolvedProblems() != null) metadata.setTotalProblems(request.getSolvedProblems().size());
            if (request.getContestRanking() != null) metadata.setTotalContests(request.getContestRanking().getAttendedContestsCount());
            syncMetadataRepository.save(metadata);

            syncLog.setStatus("SUCCESS");
            syncLog.setNewProblems(newProblems);
            syncLog.setNewSubmissions(newSubmissions);
            syncLog.setNewContests(newContests);
            syncLog.setFinishedAt(LocalDateTime.now());
            syncLog.setDurationMs(java.time.Duration.between(startTime, syncLog.getFinishedAt()).toMillis());
            syncLogRepository.save(syncLog);
            
            analyticsService.recomputeAll(userId);

        } catch (Exception e) {
            syncLog.setStatus("FAILED");
            syncLog.setErrorMessage(e.getMessage());
            syncLog.setFinishedAt(LocalDateTime.now());
            syncLog.setDurationMs(java.time.Duration.between(startTime, syncLog.getFinishedAt()).toMillis());
            syncLogRepository.save(syncLog);
            throw e;
        }
    }
}
