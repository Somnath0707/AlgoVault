package com.algovault.service;

import com.algovault.dto.SessionRequests;
import com.algovault.dto.SessionResponse;
import com.algovault.model.*;
import com.algovault.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SessionService {
    private final SessionRepository sessionRepository;
    private final SessionEventRepository sessionEventRepository;
    private final ProblemRepository problemRepository;
    private final ProblemOpenEventRepository problemOpenEventRepository;
    private final SubmissionRepository submissionRepository;
    private final RevisionCardRepository revisionCardRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final AnalyticsService analyticsService;

    @Transactional
    public SessionResponse startSession(User user, String mode) {
        sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(user.getId())
            .ifPresent(existing -> {
                existing.setEndedAt(LocalDateTime.now());
                sessionRepository.save(existing);
            });

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

        if ("TAB_SWITCH".equals(eventType) || "BLUR".equals(eventType)) {
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
        session.setFocusSeconds(max(session.getFocusSeconds(), request.getFocusSeconds()));
        session.setTabSwitches(max(session.getTabSwitches(), request.getTabSwitches()));
        session.setPasteCount(max(session.getPasteCount(), request.getPasteCount()));
        session.setFocusScore(focusScore(session.getTabSwitches(), session.getPasteCount()));

        Problem problem = problemFromRequest(request.getTitleSlug(), request.getTitle());
        if (problem != null) {
            ProblemOpenEvent event = openEvent(user, problem, request.getOpenedAt());
            event.setFocusSeconds(request.getFocusSeconds());
            event.setTabSwitches(request.getTabSwitches());
            event.setPasteCount(request.getPasteCount());
            event.setFocusScore(focusScore(request.getTabSwitches(), request.getPasteCount()));
            problemOpenEventRepository.save(event);
        }

        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    @CacheEvict(value = {"dashboard", "heatmap", "mastery", "predictions", "potd", "contests", "weakness"}, allEntries = true)
    public SessionResponse recordSubmission(User user, SessionRequests.SubmissionResultRequest request) {
        Session session = currentOrStart(user, "PRACTICE");
        Problem problem = problemFromRequest(request.getTitleSlug(), request.getTitle());
        if (problem == null) {
            return toResponse(session);
        }

        String verdict = normalizeVerdict(request.getStatusDisplay(), request.getStatusCode());
        LocalDateTime submittedAt = Optional.ofNullable(request.getSubmittedAt()).orElse(LocalDateTime.now());

        boolean exists = request.getSubmissionId() != null
            && submissionRepository.findByUserIdAndLeetcodeSubmissionId(user.getId(), request.getSubmissionId()).isPresent();
        if (!exists) {
            exists = submissionRepository.existsByUserIdAndProblemIdAndSubmittedAt(user.getId(), problem.getId(), submittedAt);
        }

        if (!exists) {
            submissionRepository.save(Submission.builder()
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
        }

        ProblemOpenEvent event = openEvent(user, problem, null);
        event.setAttemptsDuringSession(nonNull(event.getAttemptsDuringSession()) + (exists ? 0 : 1));
        if ("Accepted".equals(verdict)) {
            event.setSolved(true);
            event.setClosedAt(submittedAt);
            ensureRevisionCard(user, problem, submittedAt);
        }
        problemOpenEventRepository.save(event);

        session.setProblemsAttempted((int) submissionRepository.findByUserId(user.getId()).stream()
            .map(s -> s.getProblem().getId())
            .distinct()
            .count());
        session.setProblemsSolved((int) submissionRepository.findByUserId(user.getId()).stream()
            .filter(s -> "Accepted".equals(s.getVerdict()))
            .map(s -> s.getProblem().getId())
            .distinct()
            .count());
        sessionRepository.save(session);

        syncMetadata(user);
        analyticsService.recomputeAll(user.getId());
        return toResponse(session);
    }

    @Transactional
    public void recordSelfReport(User user, SessionRequests.SelfReportRequest request) {
        if (request.getTitleSlug() == null) return;
        Problem problem = problemRepository.findByTitleSlug(request.getTitleSlug()).orElse(null);
        if (problem == null) return;
        ProblemOpenEvent event = openEvent(user, problem, null);
        event.setSelfReportedHelp(Optional.ofNullable(request.getHelpType()).orElse("NONE"));
        problemOpenEventRepository.save(event);
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

    private Problem problemFromRequest(String titleSlug, String title) {
        if (titleSlug == null || titleSlug.isBlank()) return null;
        return problemRepository.findByTitleSlug(titleSlug)
            .orElseGet(() -> problemRepository.save(Problem.builder()
                .titleSlug(titleSlug)
                .title(title != null && !title.isBlank() ? title : titleSlug)
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
}
