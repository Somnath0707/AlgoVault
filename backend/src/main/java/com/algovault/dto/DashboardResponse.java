package com.algovault.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
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

    @Data
    @Builder
    public static class RecentSolve {
        private String title;
        private String titleSlug;
        private String difficulty;
        private LocalDateTime solvedAt;
    }
}
