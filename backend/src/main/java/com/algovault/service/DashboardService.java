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

import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

import com.algovault.model.ZenithSession;
import com.algovault.repository.ZenithSessionRepository;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
public class DashboardService {
    private final UserRepository userRepository;
    private final SyncMetadataRepository syncMetadataRepository;
    private final SubmissionRepository submissionRepository;
    private final SessionRepository sessionRepository;
    private final ZenithSessionRepository zenithSessionRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "dashboard", key = "#userId")
    public DashboardResponse getDashboard(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        SyncMetadata meta = syncMetadataRepository.findByUserId(userId).orElse(new SyncMetadata());
        
        List<Submission> recentSubs = submissionRepository.findTop100ByUserIdAndVerdictOrderBySubmittedAtDesc(userId, "Accepted");

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        int todaySubmissions = (int) submissionRepository.countSubmissionsSince(userId, startOfToday);
        int todaySolves = (int) submissionRepository.countDistinctSolvedProblemsSince(userId, startOfToday);

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
            }
        }

        List<DashboardResponse.RecentSolve> recentSolves = recentSubs.stream()
            .filter(s -> s.getProblem() != null)
            .map(s -> DashboardResponse.RecentSolve.builder()
                .title(s.getProblem().getTitle())
                .titleSlug(s.getProblem().getTitleSlug())
                .difficulty(s.getProblem().getDifficulty())
                .solvedAt(s.getSubmittedAt())
                .build())
            .collect(Collectors.toList());

        List<LocalDateTime> acceptedDates = submissionRepository.findAcceptedDatesDesc(userId);

        // Calculate Zenith Metrics
        List<ZenithSession> zenithSessions = zenithSessionRepository.findByUserId(userId);
        java.util.Map<String, java.util.Map<String, Integer>> solvedRankGrid = new java.util.HashMap<>();
        String[] grades = {"S_PLUS", "S", "A", "B"};
        String[] difficulties = {"EASY", "MEDIUM", "HARD"};
        for (String g : grades) {
            java.util.Map<String, Integer> diffMap = new java.util.HashMap<>();
            for (String d : difficulties) {
                diffMap.put(d, 0);
            }
            solvedRankGrid.put(g, diffMap);
        }

        for (ZenithSession zs : zenithSessions) {
            String grade = zs.getGrade();
            double weight = 0.0;
            if ("S_PLUS".equals(grade)) weight = 1.0;
            else if ("S".equals(grade)) weight = 0.9;
            else if ("A".equals(grade)) weight = 0.7;
            else if ("B".equals(grade)) weight = 0.5;

            double rating = zs.getProblemRating() != null ? zs.getProblemRating() : 0.0;
            if (rating == 0.0 && zs.getProblem() != null) {
                String diff = zs.getProblem().getDifficulty();
                if ("Easy".equalsIgnoreCase(diff)) rating = 1200.0;
                else if ("Medium".equalsIgnoreCase(diff)) rating = 1600.0;
                else if ("Hard".equalsIgnoreCase(diff)) rating = 2100.0;
            }

            if (solvedRankGrid.containsKey(grade)) {
                String level = "EASY";
                if (rating >= 2000.0) {
                    level = "HARD";
                } else if (rating >= 1600.0) {
                    level = "MEDIUM";
                }
                java.util.Map<String, Integer> diffMap = solvedRankGrid.get(grade);
                diffMap.put(level, diffMap.get(level) + 1);
            }
        }

        return DashboardResponse.builder()
            .lcRating(user.getLcRating())
            .virtualRating(user.getVirtualRating())
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
            .currentStreak(computeCurrentStreak(acceptedDates))
            .recentSolves(recentSolves)
            .solvedRankGrid(solvedRankGrid)
            .build();
    }

    private int computeCurrentStreak(List<LocalDateTime> acceptedDates) {
        Set<LocalDate> acceptedDays = acceptedDates.stream()
            .map(LocalDateTime::toLocalDate)
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
