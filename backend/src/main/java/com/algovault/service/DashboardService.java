package com.algovault.service;

import com.algovault.dto.DashboardResponse;
import com.algovault.model.Submission;
import com.algovault.model.SyncMetadata;
import com.algovault.model.User;
import com.algovault.model.Session;
import com.algovault.repository.SessionRepository;
import com.algovault.repository.SubmissionRepository;
import com.algovault.repository.SyncMetadataRepository;
import com.algovault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final UserRepository userRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final SubmissionRepository submissionRepository;
    private final SessionRepository sessionRepository;

    public DashboardResponse getDashboard(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        SyncMetadata meta = syncMetadataRepository.findByUserId(userId).orElse(new SyncMetadata());
        
        List<Submission> submissions = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);
        List<Submission> recentSubs = submissions.stream()
            .filter(s -> "Accepted".equals(s.getVerdict()))
            .limit(5)
            .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        int todaySubmissions = (int) submissions.stream()
            .filter(s -> s.getSubmittedAt().toLocalDate().equals(today))
            .count();
        int todaySolves = (int) submissions.stream()
            .filter(s -> "Accepted".equals(s.getVerdict()))
            .filter(s -> s.getSubmittedAt().toLocalDate().equals(today))
            .map(s -> s.getProblem().getId())
            .distinct()
            .count();

        Optional<Session> currentSession = sessionRepository.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(userId);
        int sessionTime = 0;
        int focus = 100;
        int switches = 0;
        int pastes = 0;
        if (currentSession.isPresent()) {
            Session s = currentSession.get();
            if (ChronoUnit.HOURS.between(s.getStartedAt(), LocalDateTime.now()) < 12) {
                sessionTime = (int) ChronoUnit.SECONDS.between(s.getStartedAt(), LocalDateTime.now());
                focus = s.getFocusScore() != null ? s.getFocusScore() : 100;
                switches = s.getTabSwitches() != null ? s.getTabSwitches() : 0;
                pastes = s.getPasteCount() != null ? s.getPasteCount() : 0;
            } else {
                try {
                    s.setEndedAt(s.getStartedAt().plusHours(1));
                    sessionRepository.save(s);
                } catch (Exception e) {}
            }
        }

        List<DashboardResponse.RecentSolve> recentSolves = recentSubs.stream()
            .map(s -> DashboardResponse.RecentSolve.builder()
                .title(s.getProblem().getTitle())
                .titleSlug(s.getProblem().getTitleSlug())
                .difficulty(s.getProblem().getDifficulty())
                .solvedAt(s.getSubmittedAt())
                .build())
            .collect(Collectors.toList());

        return DashboardResponse.builder()
            .lcRating(user.getLcRating())
            .lastSyncTime(meta.getLastSyncTime())
            .totalSolved((int) submissionRepository.countSolvedProblems(userId))
            .totalSubmissions((int) submissionRepository.countByUserId(userId))
            .todaySolves(todaySolves)
            .todaySubmissions(todaySubmissions)
            .sessionTimeSeconds(sessionTime)
            .focusScore(focus)
            .tabSwitches(switches)
            .pasteCount(pastes)
            .currentMode(currentSession.map(Session::getMode).orElse("PRACTICE"))
            .currentStreak(computeCurrentStreak(submissions))
            .recentSolves(recentSolves)
            .build();
    }

    private int computeCurrentStreak(List<Submission> submissions) {
        Set<LocalDate> acceptedDays = submissions.stream()
            .filter(s -> "Accepted".equals(s.getVerdict()))
            .map(s -> s.getSubmittedAt().toLocalDate())
            .collect(Collectors.toCollection(HashSet::new));

        LocalDate cursor = LocalDate.now();
        if (!acceptedDays.contains(cursor)) {
            cursor = cursor.minusDays(1);
        }

        int streak = 0;
        while (acceptedDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
