package com.algovault.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DashboardResponse {
    private Integer virtualRating;
    private Integer lcRating;
    private LocalDateTime lastSyncTime;
    private Integer totalSolved;
    private Integer totalSubmissions;
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
