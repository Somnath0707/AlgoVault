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
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
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
            // Focus time comes only from observed heartbeats. Wall-clock time
            // would count backgrounded tabs and make the dashboard dishonest.
            sessionTime = s.getFocusSeconds() != null ? s.getFocusSeconds() : 0;
            focus = s.getFocusScore() != null ? s.getFocusScore() : 100;
            switches = s.getTabSwitches() != null ? s.getTabSwitches() : 0;
            pastes = s.getPasteCount() != null ? s.getPasteCount() : 0;
        }

        // A re-submission of an already-solved problem is valuable history, but
        // it must not make the Today/weekly solve count look larger than it is.
        Set<Long> recentSolvedProblemIds = new HashSet<>();
        List<DashboardResponse.RecentSolve> recentSolves = recentSubs.stream()
            .filter(s -> s.getProblem() != null && s.getProblem().getId() != null)
            .filter(s -> recentSolvedProblemIds.add(s.getProblem().getId()))
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

        List<Submission> legacyRows = submissionRepository.findTop5000ByUserIdOrderBySubmittedAtDesc(userId);
        List<Submission> ordered = new ArrayList<>(legacyRows == null ? List.of() : legacyRows);
        ordered.sort(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())));

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
            .legacy(buildLegacy(ordered))
            .activity(buildActivity(ordered))
            .solvedRankGrid(solvedRankGrid)
            .build();
    }

    private static final java.time.format.DateTimeFormatter DD_MM_YYYY = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Profile history is derived only from persisted submissions. Nothing here
     * is projected or guessed: milestones occur at the exact accepted attempt
     * or submission that crossed a real threshold.
     */
    private DashboardResponse.Legacy buildLegacy(List<Submission> ordered) {
        List<DashboardResponse.LegacyMilestone> milestones = new ArrayList<>();
        Map<Long, List<Submission>> attemptsByProblem = new LinkedHashMap<>();
        Set<Long> solvedProblemIds = new HashSet<>();
        Map<String, Integer> difficultySolves = new HashMap<>();
        int solvedCount = 0;
        int submissionCount = 0;

        for (Submission submission : ordered) {
            submissionCount++;
            Long problemId = submission.getProblem() != null ? submission.getProblem().getId() : null;
            if (problemId != null) attemptsByProblem.computeIfAbsent(problemId, ignored -> new ArrayList<>()).add(submission);

            if (isThreshold(submissionCount)) {
                milestones.add(milestone("submission-" + submissionCount, "submission", ordinal(submissionCount) + " Submission", submission,
                    submission.getLeetcodeSubmissionId() == null ? "Submission recorded" : "Submission #" + submission.getLeetcodeSubmissionId(), null));
            }

            if (!"Accepted".equalsIgnoreCase(submission.getVerdict()) || problemId == null || !solvedProblemIds.add(problemId)) continue;

            solvedCount++;
            String title = submission.getProblem().getTitle();
            String slug = submission.getProblem().getTitleSlug();
            if (isThreshold(solvedCount)) {
                milestones.add(milestone("problem-" + solvedCount, "problem", ordinal(solvedCount) + " Problem", submission, title, slug));
            }

            String difficulty = normalizeDifficulty(submission.getProblem().getDifficulty());
            int difficultyCount = difficultySolves.merge(difficulty, 1, Integer::sum);
            if (isThreshold(difficultyCount)) {
                milestones.add(milestone(difficulty + "-" + difficultyCount, difficulty,
                    ordinal(difficultyCount) + " " + capitalize(difficulty), submission, title, slug));
            }
        }

        milestones.sort(Comparator.comparing(DashboardResponse.LegacyMilestone::getDate, Comparator.nullsLast(Comparator.naturalOrder())));
        return DashboardResponse.Legacy.builder()
            .milestones(milestones)
            .records(buildLegacyRecords(ordered, attemptsByProblem))
            .build();
    }

    private DashboardResponse.Activity buildActivity(List<Submission> ordered) {
        String[] dayNames = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        int[] dailyAccepted = new int[7];
        int[] dailyAttempted = new int[7];

        String[] hourNames = new String[24];
        for (int h = 0; h < 24; h++) {
            if (h == 0) hourNames[h] = "12 AM";
            else if (h < 12) hourNames[h] = h + " AM";
            else if (h == 12) hourNames[h] = "12 PM";
            else hourNames[h] = (h - 12) + " PM";
        }
        int[] hourlyAccepted = new int[24];
        int[] hourlyAttempted = new int[24];

        Map<String, Integer> breakdown = new LinkedHashMap<>();
        breakdown.put("Accepted", 0);
        breakdown.put("Wrong Answer", 0);
        breakdown.put("Time Limit Exceeded", 0);
        breakdown.put("Compile Error", 0);
        breakdown.put("Runtime Error", 0);
        breakdown.put("Memory Limit Exceeded", 0);

        Map<String, Integer> langCounts = new HashMap<>();
        Map<YearMonth, int[]> monthlyUnique = new TreeMap<>();
        Set<Long> solvedProblemIds = new HashSet<>();
        DateTimeFormatter monthLabelFormat = DateTimeFormatter.ofPattern("MMM yyyy");

        for (Submission s : ordered) {
            if (s.getSubmittedAt() == null) continue;
            LocalDateTime dt = s.getSubmittedAt();
            boolean isAc = "Accepted".equalsIgnoreCase(s.getVerdict());

            int dIdx = dt.getDayOfWeek().getValue() - 1;
            if (dIdx >= 0 && dIdx < 7) {
                dailyAttempted[dIdx]++;
                if (isAc) dailyAccepted[dIdx]++;
            }

            int hIdx = dt.getHour();
            if (hIdx >= 0 && hIdx < 24) {
                hourlyAttempted[hIdx]++;
                if (isAc) hourlyAccepted[hIdx]++;
            }

            String rawVerdict = s.getVerdict() != null ? s.getVerdict().trim() : "Other";
            if (isAc) breakdown.put("Accepted", breakdown.get("Accepted") + 1);
            else if ("Wrong Answer".equalsIgnoreCase(rawVerdict)) breakdown.put("Wrong Answer", breakdown.get("Wrong Answer") + 1);
            else if ("Time Limit Exceeded".equalsIgnoreCase(rawVerdict)) breakdown.put("Time Limit Exceeded", breakdown.get("Time Limit Exceeded") + 1);
            else if ("Compile Error".equalsIgnoreCase(rawVerdict)) breakdown.put("Compile Error", breakdown.get("Compile Error") + 1);
            else if ("Runtime Error".equalsIgnoreCase(rawVerdict)) breakdown.put("Runtime Error", breakdown.get("Runtime Error") + 1);
            else if ("Memory Limit Exceeded".equalsIgnoreCase(rawVerdict)) breakdown.put("Memory Limit Exceeded", breakdown.get("Memory Limit Exceeded") + 1);
            else breakdown.merge(rawVerdict, 1, Integer::sum);

            if (s.getLanguage() != null && !s.getLanguage().isBlank()) {
                String lang = s.getLanguage().toLowerCase().trim();
                langCounts.merge(lang, 1, Integer::sum);
            }

            if (isAc && s.getProblem() != null && s.getProblem().getId() != null) {
                if (solvedProblemIds.add(s.getProblem().getId())) {
                    YearMonth ym = YearMonth.from(dt.toLocalDate());
                    int[] counts = monthlyUnique.computeIfAbsent(ym, k -> new int[4]);
                    counts[0]++;
                    String diff = normalizeDifficulty(s.getProblem().getDifficulty());
                    if ("easy".equals(diff)) counts[1]++;
                    else if ("medium".equals(diff)) counts[2]++;
                    else if ("hard".equals(diff)) counts[3]++;
                }
            }
        }

        List<DashboardResponse.FrequencyPoint> dailyPoints = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            dailyPoints.add(new DashboardResponse.FrequencyPoint(dayNames[i], dailyAccepted[i], dailyAttempted[i]));
        }

        List<DashboardResponse.FrequencyPoint> hourlyPoints = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            hourlyPoints.add(new DashboardResponse.FrequencyPoint(hourNames[i], hourlyAccepted[i], hourlyAttempted[i]));
        }

        List<DashboardResponse.ProgressPoint> progressPoints = new ArrayList<>();
        int cumTotal = 0, cumEasy = 0, cumMed = 0, cumHard = 0;
        for (Map.Entry<YearMonth, int[]> entry : monthlyUnique.entrySet()) {
            cumTotal += entry.getValue()[0];
            cumEasy += entry.getValue()[1];
            cumMed += entry.getValue()[2];
            cumHard += entry.getValue()[3];
            progressPoints.add(DashboardResponse.ProgressPoint.builder()
                .date(entry.getKey().toString())
                .dateLabel(entry.getKey().format(monthLabelFormat))
                .totalSolved(cumTotal)
                .easySolved(cumEasy)
                .mediumSolved(cumMed)
                .hardSolved(cumHard)
                .build());
        }

        List<DashboardResponse.LanguageStat> languageStats = langCounts.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .map(e -> new DashboardResponse.LanguageStat(e.getKey(), e.getValue()))
            .toList();

        return DashboardResponse.Activity.builder()
            .codingFrequency(DashboardResponse.CodingFrequency.builder()
                .daily(dailyPoints)
                .hourly(hourlyPoints)
                .build())
            .progressTracker(progressPoints)
            .submissionBreakdown(breakdown)
            .languageStats(languageStats)
            .build();
    }

    private DashboardResponse.LegacyMilestone milestone(String id, String type, String label, Submission submission, String detail, String slug) {
        return DashboardResponse.LegacyMilestone.builder()
            .id(id)
            .type(type)
            .label(label)
            .date(submission.getSubmittedAt() == null ? "" : submission.getSubmittedAt().format(DD_MM_YYYY))
            .detail(detail == null || detail.isBlank() ? "Accepted problem" : detail)
            .slug(slug)
            .build();
    }

    private DashboardResponse.LegacyRecords buildLegacyRecords(List<Submission> ordered, Map<Long, List<Submission>> attemptsByProblem) {
        Map<LocalDate, Integer> submissionsByDay = new HashMap<>();
        Map<LocalDate, Integer> firstSolvesByDay = new HashMap<>();
        Map<YearMonth, Integer> firstSolvesByMonth = new HashMap<>();
        Map<Integer, Integer> firstSolvesByYear = new HashMap<>();
        Set<Long> accepted = new HashSet<>();
        List<LocalDate> acceptedDays = new ArrayList<>();
        int oneShot = 0;

        for (Submission submission : ordered) {
            if (submission.getSubmittedAt() == null) continue;
            LocalDate day = submission.getSubmittedAt().toLocalDate();
            submissionsByDay.merge(day, 1, Integer::sum);
            Long problemId = submission.getProblem() != null ? submission.getProblem().getId() : null;
            if (!"Accepted".equalsIgnoreCase(submission.getVerdict()) || problemId == null || !accepted.add(problemId)) continue;
            acceptedDays.add(day);
            firstSolvesByDay.merge(day, 1, Integer::sum);
            firstSolvesByMonth.merge(YearMonth.from(day), 1, Integer::sum);
            firstSolvesByYear.merge(day.getYear(), 1, Integer::sum);
            List<Submission> attempts = attemptsByProblem.getOrDefault(problemId, List.of());
            if (!attempts.isEmpty() && attempts.get(0).getId().equals(submission.getId())) oneShot++;
        }

        acceptedDays = acceptedDays.stream().distinct().sorted().toList();
        int longestStreak = 0;
        int currentStreak = 0;
        int longestBreak = 0;
        LocalDate previous = null;
        for (LocalDate day : acceptedDays) {
            if (previous == null || day.equals(previous.plusDays(1))) currentStreak++;
            else {
                longestBreak = Math.max(longestBreak, (int) ChronoUnit.DAYS.between(previous, day) - 1);
                currentStreak = 1;
            }
            longestStreak = Math.max(longestStreak, currentStreak);
            previous = day;
        }

        Map.Entry<LocalDate, Integer> busiest = maxEntry(submissionsByDay);
        Map.Entry<LocalDate, Integer> bestDay = maxEntry(firstSolvesByDay);
        Map.Entry<YearMonth, Integer> bestMonth = maxEntry(firstSolvesByMonth);
        Map.Entry<Integer, Integer> bestYear = maxEntry(firstSolvesByYear);
        return DashboardResponse.LegacyRecords.builder()
            .oneShotSolves(oneShot)
            .longestStreakDays(longestStreak)
            .longestBreakDays(longestBreak)
            .busiestDaySubmissions(busiest == null ? 0 : busiest.getValue())
            .busiestDay(busiest == null ? null : busiest.getKey().toString())
            .bestDaySolves(bestDay == null ? 0 : bestDay.getValue())
            .bestDay(bestDay == null ? null : bestDay.getKey().toString())
            .bestMonthSolves(bestMonth == null ? 0 : bestMonth.getValue())
            .bestMonth(bestMonth == null ? null : bestMonth.getKey().toString())
            .bestYearSolves(bestYear == null ? 0 : bestYear.getValue())
            .bestYear(bestYear == null ? null : String.valueOf(bestYear.getKey()))
            .build();
    }

    private static <K> Map.Entry<K, Integer> maxEntry(Map<K, Integer> values) {
        return values.entrySet().stream().max(Map.Entry.comparingByValue()).orElse(null);
    }

    private static boolean isThreshold(int value) {
        return value == 1 || value == 10 || value == 50 || value == 100 || value == 500 || value == 1000 || value == 2000 || value == 3000 || value == 4000 || value == 5000;
    }

    private static String ordinal(int value) {
        int remainder = value % 100;
        if (remainder < 11 || remainder > 13) {
            return switch (value % 10) { case 1 -> value + "st"; case 2 -> value + "nd"; case 3 -> value + "rd"; default -> value + "th"; };
        }
        return value + "th";
    }

    private static String normalizeDifficulty(String value) {
        if ("Easy".equalsIgnoreCase(value)) return "easy";
        if ("Hard".equalsIgnoreCase(value)) return "hard";
        return "medium";
    }

    private static String capitalize(String value) {
        return value.substring(0, 1).toUpperCase() + value.substring(1);
    }

    private int computeCurrentStreak(List<LocalDateTime> acceptedDates) {
        if (acceptedDates == null || acceptedDates.isEmpty()) {
            return 0;
        }

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
