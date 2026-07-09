package com.algovault.service;

import com.algovault.dto.SessionRequests;
import com.algovault.dto.SessionResponse;
import com.algovault.model.*;
import com.algovault.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
public class SessionService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SessionService.class);

    private final SessionRepository sessionRepository;
    private final SessionEventRepository sessionEventRepository;
    private final ProblemRepository problemRepository;
    private final ProblemOpenEventRepository problemOpenEventRepository;
    private final SubmissionRepository submissionRepository;
    private final RevisionCardRepository revisionCardRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final AnalyticsService analyticsService;
    private final ZerotracService zerotracService;
    private final ProblemService problemService;
    private final AnalyticsMetricRepository analyticsMetricRepository;

    private Problem problemFromRequest(String titleSlug, String title) {
        return problemService.getOrCreate(titleSlug, title);
    }

    @Transactional
    public SessionResponse startSession(User user, String mode) {

        Optional<Session> existingOpt = sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(user.getId());
        if (existingOpt.isPresent()) {
            Session existing = existingOpt.get();
            if (existing.getProblemsAttempted() != null && existing.getProblemsAttempted() == 0 &&
                existing.getProblemsSolved() != null && existing.getProblemsSolved() == 0 &&
                existing.getMode() != null && existing.getMode().equals(normalizeMode(mode)) &&
                existing.getStartedAt() != null && existing.getStartedAt().isAfter(LocalDateTime.now().minusMinutes(1))) {
                return toResponse(existing);
            }
            existing.setEndedAt(LocalDateTime.now());
            sessionRepository.save(existing);
        }

        Session session = sessionRepository.save(Session.builder()
            .user(user)
            .mode(normalizeMode(mode))
            .startedAt(LocalDateTime.now())
            .problemsAttempted(0)
            .problemsSolved(0)
            .focusSeconds(0)
            .tabSwitches(0)
            .pasteCount(0)
            .focusScore(100)
            .build());
        return toResponse(session);
    }

    @Transactional
    public SessionResponse endCurrentSession(User user) {
        Session session = currentOrStart(user, "PRACTICE");
        session.setEndedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public SessionResponse recordEvent(User user, SessionRequests.EventRequest request) {
        Session session = currentOrStart(user, "PRACTICE");
        String eventType = Optional.ofNullable(request.getEventType()).orElse("UNKNOWN");

        sessionEventRepository.save(SessionEvent.builder()
            .session(session)
            .eventType(eventType)
            .timestamp(Optional.ofNullable(request.getTimestamp()).orElse(LocalDateTime.now()))
            .metadata(Optional.ofNullable(request.getMetadata()).orElse(Map.of()))
            .build());

        if ("OPEN".equals(eventType) && request.getTitleSlug() != null) {
            Problem problem = problemFromRequest(request.getTitleSlug(), request.getTitle());
            if (problem != null) {
                openEvent(user, problem, request.getTimestamp());
            }
        }
        if ("CLOSE".equals(eventType) && request.getTitleSlug() != null) {
            problemRepository.findByTitleSlug(request.getTitleSlug()).ifPresent(problem ->
                problemOpenEventRepository
                    .findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(user.getId(), problem.getId())
                    .ifPresent(openEvent -> {
                        openEvent.setClosedAt(Optional.ofNullable(request.getTimestamp()).orElse(LocalDateTime.now()));
                        problemOpenEventRepository.save(openEvent);
                    })
            );
        }

        if ("TAB_SWITCH".equals(eventType)) {
            session.setTabSwitches(nonNull(session.getTabSwitches()) + 1);
        }
        if ("PASTE".equals(eventType)) {
            session.setPasteCount(nonNull(session.getPasteCount()) + 1);
        }
        session.setFocusScore(focusScore(session.getTabSwitches(), session.getPasteCount()));
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public SessionResponse heartbeat(User user, SessionRequests.HeartbeatRequest request) {
        Session session = currentOrStart(user, "PRACTICE");
        
        String incomingEpoch = request.getHeartbeatEpoch();
        if (incomingEpoch != null && !incomingEpoch.isBlank()) {
            if (!incomingEpoch.equals(session.getLastHeartbeatEpoch())) {
                session.setAccumulatedFocusSeconds(nonNull(session.getFocusSeconds()));
                session.setAccumulatedTabSwitches(nonNull(session.getTabSwitches()));
                session.setAccumulatedPasteCount(nonNull(session.getPasteCount()));
                session.setLastHeartbeatEpoch(incomingEpoch);
            }
            session.setFocusSeconds(nonNull(session.getAccumulatedFocusSeconds()) + nonNull(request.getFocusSeconds()));
            session.setTabSwitches(nonNull(session.getAccumulatedTabSwitches()) + nonNull(request.getTabSwitches()));
            session.setPasteCount(nonNull(session.getAccumulatedPasteCount()) + nonNull(request.getPasteCount()));
        } else {
            session.setFocusSeconds(max(session.getFocusSeconds(), request.getFocusSeconds()));
            session.setTabSwitches(max(session.getTabSwitches(), request.getTabSwitches()));
            session.setPasteCount(max(session.getPasteCount(), request.getPasteCount()));
        }
        session.setFocusScore(focusScore(session.getTabSwitches(), session.getPasteCount()));

        Problem problem = problemFromRequest(request.getTitleSlug(), request.getTitle());
        if (problem != null) {
            ProblemOpenEvent event = openEvent(user, problem, request.getOpenedAt());
            Integer problemFocusSeconds = request.getProblemFocusSeconds() != null ? request.getProblemFocusSeconds() : request.getFocusSeconds();
            Integer problemTabSwitches = request.getProblemTabSwitches() != null ? request.getProblemTabSwitches() : request.getTabSwitches();
            Integer problemPasteCount = request.getProblemPasteCount() != null ? request.getProblemPasteCount() : request.getPasteCount();
            event.setFocusSeconds(problemFocusSeconds);
            event.setTabSwitches(problemTabSwitches);
            event.setPasteCount(problemPasteCount);
            event.setFocusScore(focusScore(problemTabSwitches, problemPasteCount));
            problemOpenEventRepository.save(event);
        }

        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "dashboard", key = "#user.id"),
        @CacheEvict(value = "heatmap", key = "#user.id"),
        @CacheEvict(value = "mastery", key = "#user.id"),
        @CacheEvict(value = "potd", key = "#user.id"),
        @CacheEvict(value = "contests", key = "#user.id"),
        @CacheEvict(value = "weakness", key = "#user.id"),
        @CacheEvict(value = "predictions", key = "#user.id + '-' + #request.titleSlug")
    })
    public SessionResponse recordSubmission(User user, SessionRequests.SubmissionResultRequest request) {
        Session session = currentOrStart(user, "PRACTICE");
        Problem problem = problemFromRequest(request.getTitleSlug(), request.getTitle());
        if (problem == null) {
            return toResponse(session);
        }

        String verdict = normalizeVerdict(request.getStatusDisplay(), request.getStatusCode());
        LocalDateTime submittedAt = Optional.ofNullable(request.getSubmittedAt()).orElse(LocalDateTime.now());

        boolean exists = request.getSubmissionId() != null && !request.getSubmissionId().isBlank()
            && submissionRepository.findByUserIdAndLeetcodeSubmissionId(user.getId(), request.getSubmissionId()).isPresent();
        if (!exists) {
            exists = submissionRepository.existsByTighterTuple(user.getId(), problem.getId(), verdict, submittedAt, request.getRuntimeMs());
        }

        Submission submission = null;
        if (!exists) {
            submission = submissionRepository.save(Submission.builder()
                .user(user)
                .problem(problem)
                .leetcodeSubmissionId(request.getSubmissionId())
                .verdict(verdict)
                .language(request.getLanguage())
                .runtimeMs(request.getRuntimeMs())
                .memoryKb(request.getMemoryKb())
                .totalCorrect(request.getTotalCorrect())
                .totalTestcases(request.getTotalTestcases())
                .source("REALTIME")
                .submittedAt(submittedAt)
                .build());
        } else {
            if (request.getSubmissionId() != null && !request.getSubmissionId().isBlank()) {
                submission = submissionRepository.findByUserIdAndLeetcodeSubmissionId(user.getId(), request.getSubmissionId()).orElse(null);
            }
            if (submission == null) {
                List<Submission> matches = submissionRepository.findByUserIdAndProblemId(user.getId(), problem.getId());
                submission = matches.isEmpty() ? null : matches.get(matches.size() - 1);
            }
        }

        ProblemOpenEvent event = openEvent(user, problem, null);
        event.setAttemptsDuringSession(nonNull(event.getAttemptsDuringSession()) + (exists ? 0 : 1));
        if ("Accepted".equals(verdict)) {
            event.setSolved(true);
            event.setClosedAt(submittedAt);
            ensureRevisionCard(user, problem, submittedAt);
        }
        problemOpenEventRepository.save(event);

        // Resolve prediction metrics for this user & problem
        List<AnalyticsMetric> unresolved = analyticsMetricRepository.findByUserIdAndActualResultIsNull(user.getId());
        for (AnalyticsMetric m : unresolved) {
            if (m.getProblem().getId().equals(problem.getId())) {
                m.setActualResult("Accepted".equals(verdict));
                m.setResolvedAt(LocalDateTime.now());
                analyticsMetricRepository.save(m);
            }
        }

        session.setProblemsAttempted((int) submissionRepository.countDistinctProblemsSince(user.getId(), session.getStartedAt()));
        session.setProblemsSolved((int) submissionRepository.countDistinctSolvedProblemsSince(user.getId(), session.getStartedAt()));
        sessionRepository.save(session);

        syncMetadata(user);
        if (submission != null) {
            analyticsService.updateIncremental(user.getId(), submission);
        }
        return toResponse(session);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "dashboard", key = "#user.id"),
        @CacheEvict(value = "heatmap", key = "#user.id"),
        @CacheEvict(value = "mastery", key = "#user.id"),
        @CacheEvict(value = "potd", key = "#user.id"),
        @CacheEvict(value = "contests", key = "#user.id"),
        @CacheEvict(value = "weakness", key = "#user.id"),
        @CacheEvict(value = "predictions", key = "#user.id + '-' + #request.titleSlug")
    })
    public void recordSelfReport(User user, SessionRequests.SelfReportRequest request) {
        if (request.getTitleSlug() == null) return;
        Problem problem = problemRepository.findByTitleSlug(request.getTitleSlug()).orElse(null);
        if (problem == null) return;
        ProblemOpenEvent event = openEvent(user, problem, null);
        event.setSelfReportedHelp(Optional.ofNullable(request.getHelpType()).orElse("NONE"));
        problemOpenEventRepository.save(event);
        analyticsService.updateIncremental(user.getId(), event);
    }

    @Transactional(readOnly = true)
    public SessionResponse getCurrent(User user) {
        return sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(user.getId())
            .map(this::toResponse)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getToday(User user) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        return sessionRepository.findByUserIdAndStartedAtAfterOrderByStartedAtDesc(user.getId(), startOfDay)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getAll(User user) {
        return sessionRepository.findByUserIdOrderByStartedAtDesc(user.getId())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    private Session currentOrStart(User user, String mode) {
        return sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(user.getId())
            .orElseGet(() -> sessionRepository.save(Session.builder()
                .user(user)
                .mode(normalizeMode(mode))
                .startedAt(LocalDateTime.now())
                .problemsAttempted(0)
                .problemsSolved(0)
                .focusSeconds(0)
                .tabSwitches(0)
                .pasteCount(0)
                .focusScore(100)
                .build()));
    }

    private ProblemOpenEvent openEvent(User user, Problem problem, LocalDateTime openedAt) {
        return problemOpenEventRepository
            .findFirstByUserIdAndProblemIdAndClosedAtIsNullOrderByOpenedAtDesc(user.getId(), problem.getId())
            .orElseGet(() -> problemOpenEventRepository.save(ProblemOpenEvent.builder()
                .user(user)
                .problem(problem)
                .openedAt(Optional.ofNullable(openedAt).orElse(LocalDateTime.now()))
                .focusSeconds(0)
                .tabSwitches(0)
                .pasteCount(0)
                .focusScore(100)
                .solved(false)
                .attemptsDuringSession(0)
                .selfReportedHelp("NONE")
                .build()));
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

    private void syncMetadata(User user) {
        SyncMetadata metadata = syncMetadataRepository.findByUserId(user.getId())
            .orElse(SyncMetadata.builder().user(user).build());
        metadata.setLastSyncTime(LocalDateTime.now());
        metadata.setTotalProblems((int) submissionRepository.countSolvedProblems(user.getId()));
        metadata.setTotalSubmissions((int) submissionRepository.countByUserId(user.getId()));
        syncMetadataRepository.save(metadata);
    }

    private String normalizeVerdict(String statusDisplay, Integer statusCode) {
        if (statusDisplay != null && !statusDisplay.isBlank()) {
            return statusDisplay;
        }
        if (statusCode == null) return "Unknown";
        return switch (statusCode) {
            case 10 -> "Accepted";
            case 11 -> "Wrong Answer";
            case 14 -> "Time Limit Exceeded";
            case 15 -> "Runtime Error";
            case 20 -> "Compile Error";
            default -> "Unknown";
        };
    }

    private String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) return "PRACTICE";
        return mode.trim().toUpperCase();
    }

    private Integer focusScore(Integer tabSwitches, Integer pasteCount) {
        return Math.max(0, 100 - nonNull(tabSwitches) * 5 - nonNull(pasteCount) * 15);
    }

    private Integer max(Integer current, Integer next) {
        if (next == null) return nonNull(current);
        return Math.max(nonNull(current), next);
    }

    private int nonNull(Integer value) {
        return value == null ? 0 : value;
    }

    private SessionResponse toResponse(Session session) {
        return SessionResponse.builder()
            .id(session.getId())
            .mode(session.getMode())
            .startedAt(session.getStartedAt())
            .endedAt(session.getEndedAt())
            .problemsAttempted(nonNull(session.getProblemsAttempted()))
            .problemsSolved(nonNull(session.getProblemsSolved()))
            .focusSeconds(nonNull(session.getFocusSeconds()))
            .tabSwitches(nonNull(session.getTabSwitches()))
            .pasteCount(nonNull(session.getPasteCount()))
            .focusScore(focusScore(session.getTabSwitches(), session.getPasteCount()))
            .build();
    }

    @Transactional
    @Scheduled(fixedDelay = 900000) // Runs every 15 minutes
    public void closeStaleSessions() {
        log.info("Running stale session auto-closure check");
        List<Session> openSessions = sessionRepository.findByEndedAtIsNull();
        LocalDateTime now = LocalDateTime.now();
        for (Session s : openSessions) {
            if (s.getStartedAt() != null && java.time.temporal.ChronoUnit.HOURS.between(s.getStartedAt(), now) >= 12) {
                try {
                    s.setEndedAt(s.getStartedAt().plusHours(1));
                    sessionRepository.save(s);
                    log.info("Auto-closed stale session id: {} for user: {}", s.getId(), s.getUser().getId());
                } catch (Exception e) {
                    log.warn("Failed to auto-close stale session {}", s.getId(), e);
                }
            }
        }
    }
}
