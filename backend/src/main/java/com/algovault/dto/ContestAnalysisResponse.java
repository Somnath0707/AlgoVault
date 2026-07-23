package com.algovault.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestAnalysisResponse {
    private String contestTitle;
    private String contestSlug;
    private LocalDateTime contestDate;
    private Integer rank;
    private Double ratingBefore;
    private Double ratingAfter;
    private Double ratingDelta;
    private Double predictedDelta;
    private Integer problemsSolved;
    private Integer totalProblems;
    private Double finishTimeMinutes;
    private String panicIndex;
    private String chokingIndex;
    private String staminaDropoff;
    private List<QuestionTiming> timings;
    private Object questionDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionTiming {
        private String questionLabel;
        private Double minutesSpent;
        private Boolean solved;
    }
}
