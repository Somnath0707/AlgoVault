package com.algovault.service;

import com.algovault.dto.SyncLeetcodeRequest;
import com.algovault.model.*;
import com.algovault.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
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
    private final ZerotracService zerotracService;
    private final RevisionCardRepository revisionCardRepository;

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "dashboard", key = "#userId"),
        @CacheEvict(value = "heatmap", key = "#userId"),
        @CacheEvict(value = "mastery", key = "#userId"),
        @CacheEvict(value = "potd", key = "#userId"),
        @CacheEvict(value = "contests", key = "#userId"),
        @CacheEvict(value = "weakness", key = "#userId"),
        @CacheEvict(value = "predictions", allEntries = true)
    })
    public void syncLeetcode(Long userId, SyncLeetcodeRequest request) {
        log.info("Starting sync for user ID: {}", userId);
        LocalDateTime startTime = LocalDateTime.now();

        SyncLog syncLog = syncLogRepository.save(SyncLog.builder()
            .user(User.builder().id(userId).build())
            .startedAt(startTime)
            .status("RUNNING")
            .newProblems(0)
            .newSubmissions(0)
            .newContests(0)
            .build());

        try {
            User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            updateUserProfile(user, request);

            Map<String, Double> zerotracRatings = zerotracService.getRatingsBySlug();
            ProblemUpsertResult problemUpsert = upsertSolvedProblems(request, zerotracRatings);
            Map<String, Problem> problemCache = problemUpsert.problemCache();
            upsertMissingSubmissionProblems(request, zerotracRatings, problemCache);
            int newProblems = problemUpsert.newProblems();

            int newSubmissions = upsertSubmissions(user, request, problemCache);
            resolvePredictionMetrics(userId, request);
            int newContests = upsertContestHistory(user, request);
            updateSyncMetadata(user, request);

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

    private void updateUserProfile(User user, SyncLeetcodeRequest request) {
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            if (user.getLcUsername() != null && !user.getLcUsername().equalsIgnoreCase(request.getUsername().trim())) {
                throw new IllegalArgumentException("Sync username does not match the authenticated user");
            }
            user.setLcUsername(request.getUsername());
            user.setUsername(request.getUsername());
        }
        if (request.getProfile() != null) {
            user.setAvatarUrl(request.getProfile().getUserAvatar());
        }
        if (request.getContestRanking() != null && request.getContestRanking().getRating() != null) {
            user.setLcRating(request.getContestRanking().getRating().intValue());
            if (user.getVirtualRating() == null) {
                user.setVirtualRating(user.getLcRating());
            }
        }
        userRepository.save(user);
    }

    private ProblemUpsertResult upsertSolvedProblems(SyncLeetcodeRequest request, Map<String, Double> zerotracRatings) {
        Map<String, Problem> problemCache = new HashMap<>();
        int newProblems = 0;
        for (SyncLeetcodeRequest.ProblemInfo pInfo : Optional.ofNullable(request.getSolvedProblems()).orElse(List.of())) {
            if (pInfo.getTitleSlug() == null || pInfo.getTitle() == null) {
                continue;
            }

            boolean isNew = false;
            Problem problem = problemRepository.findByTitleSlug(pInfo.getTitleSlug()).orElse(null);
            if (problem == null) {
                problem = new Problem();
                problem.setTitleSlug(pInfo.getTitleSlug());
                isNew = true;
            }

            problem.setFrontendId(pInfo.getFrontendQuestionId());
            problem.setTitle(pInfo.getTitle());
            problem.setDifficulty(pInfo.getDifficulty());
            if (pInfo.getTopicTags() != null) {
                problem.setTags(pInfo.getTopicTags().stream()
                    .map(SyncLeetcodeRequest.TagInfo::getName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList()));
            }
            Double rating = zerotracRatings.get(problem.getTitleSlug());
            if (rating != null) {
                problem.setActualRating(rating);
            }

            problem = problemRepository.save(problem);
            if (isNew) {
                log.debug("Created problem {}", problem.getTitleSlug());
                newProblems++;
            }
            problemCache.put(problem.getTitleSlug(), problem);
        }
        return new ProblemUpsertResult(problemCache, newProblems);
    }

    private int upsertSubmissions(User user, SyncLeetcodeRequest request, Map<String, Problem> problemCache) {
        int newSubmissions = 0;
        for (SyncLeetcodeRequest.SubmissionInfo sInfo : Optional.ofNullable(request.getSubmissions()).orElse(List.of())) {
            if (sInfo.getTitleSlug() == null || sInfo.getTimestamp() == null || sInfo.getStatusDisplay() == null || sInfo.getLang() == null) {
                continue;
            }

            LocalDateTime submittedAt = LocalDateTime.ofInstant(
                Instant.ofEpochSecond(Long.parseLong(sInfo.getTimestamp())),
                ZoneId.systemDefault()
            );

            Problem problem = problemCache.computeIfAbsent(
                sInfo.getTitleSlug(),
                slug -> problemRepository.findByTitleSlug(slug).orElse(null)
            );
            if (problem == null) {
                continue;
            }

            boolean exists = sInfo.getId() != null && !sInfo.getId().isBlank()
                && submissionRepository.findByUserIdAndLeetcodeSubmissionId(user.getId(), sInfo.getId()).isPresent();
            if (!exists) {
                exists = submissionRepository.existsByTighterTuple(user.getId(), problem.getId(), sInfo.getStatusDisplay(), submittedAt, parseRuntimeMs(sInfo.getRuntime()));
            }
            if (exists) {
                continue;
            }

            Submission sub = Submission.builder()
                .user(user)
                .problem(problem)
                .leetcodeSubmissionId(sInfo.getId())
                .verdict(sInfo.getStatusDisplay())
                .language(sInfo.getLang())
                .runtimeMs(parseRuntimeMs(sInfo.getRuntime()))
                .memoryKb(parseMemoryKb(sInfo.getMemory()))
                .source("HISTORY_SYNC")
                .submittedAt(submittedAt)
                .build();
            submissionRepository.save(sub);

            if ("Accepted".equals(sInfo.getStatusDisplay())) {
                ensureRevisionCard(user, problem, submittedAt);
            }
            newSubmissions++;
        }
        return newSubmissions;
    }

    private void upsertMissingSubmissionProblems(
        SyncLeetcodeRequest request,
        Map<String, Double> zerotracRatings,
        Map<String, Problem> problemCache
    ) {
        for (SyncLeetcodeRequest.SubmissionInfo submission : Optional.ofNullable(request.getSubmissions()).orElse(List.of())) {
            String slug = submission.getTitleSlug();
            if (slug == null || slug.isBlank() || problemCache.containsKey(slug)) {
                continue;
            }
            Problem problem = problemRepository.findByTitleSlug(slug).orElseGet(() -> Problem.builder()
                .titleSlug(slug)
                .title(submission.getTitle() != null && !submission.getTitle().isBlank() ? submission.getTitle() : slug)
                .build());
            if (problem.getActualRating() == null) {
                problem.setActualRating(zerotracRatings.get(slug));
            }
            problemCache.put(slug, problemRepository.save(problem));
        }
    }

    private void resolvePredictionMetrics(Long userId, SyncLeetcodeRequest request) {
        List<SyncLeetcodeRequest.SubmissionInfo> submissions = Optional.ofNullable(request.getSubmissions()).orElse(List.of());
        List<AnalyticsMetric> unresolvedMetrics = analyticsMetricRepository.findByUserIdAndActualResultIsNull(userId);
        for (AnalyticsMetric metric : unresolvedMetrics) {
            String slug = metric.getProblem().getTitleSlug();
            boolean solvedNow = submissions.stream()
                .anyMatch(s -> slug.equals(s.getTitleSlug()) && "Accepted".equals(s.getStatusDisplay()));
            boolean failedNow = submissions.stream()
                .anyMatch(s -> slug.equals(s.getTitleSlug()) && !"Accepted".equals(s.getStatusDisplay()));

            if (solvedNow || failedNow) {
                metric.setActualResult(solvedNow);
                metric.setResolvedAt(LocalDateTime.now());
                analyticsMetricRepository.save(metric);
            }
        }
    }

    private int upsertContestHistory(User user, SyncLeetcodeRequest request) {
        int newContests = 0;
        Double previousRating = null;
        List<SyncLeetcodeRequest.ContestHistoryInfo> history = Optional.ofNullable(request.getContestHistory()).orElse(List.of());
        history.sort(Comparator.comparing(c -> c.getContest() != null ? c.getContest().getStartTime() : 0L));

        List<SyncLeetcodeRequest.SubmissionInfo> subs = Optional.ofNullable(request.getSubmissions()).orElse(List.of());

        for (SyncLeetcodeRequest.ContestHistoryInfo cInfo : history) {
            if (!Boolean.TRUE.equals(cInfo.getAttended()) || cInfo.getContest() == null || cInfo.getContest().getTitle() == null) {
                continue;
            }

            String title = cInfo.getContest().getTitle();
            long startTime = cInfo.getContest().getStartTime();
            long endTime = startTime + 5400; // 90 mins

            Map<String, Object> questionDetails = new HashMap<>();
            List<Map<String, Object>> contestSubs = new ArrayList<>();
            for (SyncLeetcodeRequest.SubmissionInfo sub : subs) {
                if (sub.getTimestamp() != null) {
                    try {
                        long ts = Long.parseLong(sub.getTimestamp());
                        if (ts >= startTime && ts <= endTime) {
                            Map<String, Object> sData = new HashMap<>();
                            sData.put("titleSlug", sub.getTitleSlug());
                            sData.put("timestamp", ts);
                            sData.put("verdict", sub.getStatusDisplay());
                            contestSubs.add(sData);
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
            if (!contestSubs.isEmpty()) {
                questionDetails.put("submissions", contestSubs);
            }

            ContestResult existing = contestResultRepository.findByUserIdAndContestTitle(user.getId(), title).orElse(null);
            if (existing != null) {
                Double priorRating = previousRating;
                existing.setContestSlug(cInfo.getContest().getTitleSlug());
                existing.setNewRating(cInfo.getRating());
                existing.setRatingDelta(priorRating != null && cInfo.getRating() != null ? cInfo.getRating() - priorRating : null);
                existing.setRank(cInfo.getRanking());
                existing.setProblemsSolved(cInfo.getProblemsSolved());
                existing.setTotalProblems(cInfo.getTotalProblems());
                existing.setFinishTimeSecs(cInfo.getFinishTimeInSeconds());
                existing.setQuestionDetails(questionDetails);
                contestResultRepository.save(existing);
                previousRating = cInfo.getRating();
                continue;
            }

            ContestResult result = ContestResult.builder()
                .user(user)
                .contestTitle(title)
                .contestSlug(cInfo.getContest().getTitleSlug())
                .contestDate(LocalDateTime.ofInstant(Instant.ofEpochSecond(startTime), ZoneId.systemDefault()))
                .rank(cInfo.getRanking())
                .newRating(cInfo.getRating())
                .ratingDelta(previousRating != null && cInfo.getRating() != null ? cInfo.getRating() - previousRating : null)
                .problemsSolved(cInfo.getProblemsSolved())
                .totalProblems(cInfo.getTotalProblems())
                .finishTimeSecs(cInfo.getFinishTimeInSeconds())
                .questionDetails(questionDetails)
                .build();

            contestResultRepository.save(result);
            previousRating = cInfo.getRating();
            newContests++;
        }
        return newContests;
    }

    private void updateSyncMetadata(User user, SyncLeetcodeRequest request) {
        SyncMetadata metadata = syncMetadataRepository.findByUserId(user.getId())
            .orElse(SyncMetadata.builder().user(user).build());
        metadata.setLastSyncTime(LocalDateTime.now());
        metadata.setTotalProblems((int) submissionRepository.countSolvedProblems(user.getId()));
        metadata.setTotalSubmissions((int) submissionRepository.countByUserId(user.getId()));
        if (request.getContestRanking() != null) {
            metadata.setTotalContests(request.getContestRanking().getAttendedContestsCount());
        }
        syncMetadataRepository.save(metadata);
    }

    private void ensureRevisionCard(User user, Problem problem, LocalDateTime solvedAt) {
        revisionCardRepository.findByUserIdAndProblemId(user.getId(), problem.getId())
            .orElseGet(() -> revisionCardRepository.save(RevisionCard.builder()
                .user(user)
                .problem(problem)
                .confidence(3)
                .intervalDays(1.0)
                .easeFactor(2.5)
                .nextReview(solvedAt.plusDays(1))
                .reviewCount(0)
                .build()));
    }

    private Integer parseRuntimeMs(String runtime) {
        if (runtime == null) return null;
        String digits = runtime.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? null : Integer.parseInt(digits);
    }

    private Integer parseMemoryKb(String memory) {
        if (memory == null) return null;
        String normalized = memory.trim().toUpperCase(Locale.ROOT);
        String number = normalized.replaceAll("[^0-9.]", "");
        if (number.isEmpty()) return null;
        double value = Double.parseDouble(number);
        if (normalized.contains("MB")) return (int) Math.round(value * 1024);
        return (int) Math.round(value);
    }

    private record ProblemUpsertResult(Map<String, Problem> problemCache, int newProblems) {}
}
