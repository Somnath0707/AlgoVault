package com.algovault.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private Integer lcRating;
    private Integer virtualRating;
    private LocalDateTime lastSyncTime;
    private Integer totalSolved;
    private Integer totalSubmissions;
    private Integer todaySolves;
    private Integer todaySubmissions;
    private Integer sessionTimeSeconds;
    private Integer focusScore;
    private Integer tabSwitches;
    private Integer pasteCount;
    private String currentMode;
    private Integer currentStreak;
    private List<RecentSolve> recentSolves;
    private Legacy legacy;
    private Activity activity;

    // Zenith metrics
    private Map<String, Map<String, Integer>> solvedRankGrid;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Activity {
        private CodingFrequency codingFrequency;
        private List<ProgressPoint> progressTracker;
        private Map<String, Integer> submissionBreakdown;
        private List<LanguageStat> languageStats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CodingFrequency {
        private List<FrequencyPoint> daily;
        private List<FrequencyPoint> hourly;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FrequencyPoint {
        private String label;
        private int accepted;
        private int attempted;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgressPoint {
        private String dateLabel;
        private String date;
        private int totalSolved;
        private int easySolved;
        private int mediumSolved;
        private int hardSolved;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LanguageStat {
        private String language;
        private int count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSolve {
        private String title;
        private String titleSlug;
        private String difficulty;
        private LocalDateTime solvedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Legacy {
        private List<LegacyMilestone> milestones;
        private LegacyRecords records;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LegacyMilestone {
        private String id;
        private String type;
        private String label;
        private String date;
        private String detail;
        private String slug;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LegacyRecords {
        private int oneShotSolves;
        private int longestStreakDays;
        private int longestBreakDays;
        private int busiestDaySubmissions;
        private String busiestDay;
        private int bestDaySolves;
        private String bestDay;
        private int bestMonthSolves;
        private String bestMonth;
        private int bestYearSolves;
        private String bestYear;
    }
}
