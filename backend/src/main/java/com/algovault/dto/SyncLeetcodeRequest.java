package com.algovault.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class SyncLeetcodeRequest {
    @NotBlank
    @Size(max = 100)
    private String username;

    @jakarta.validation.Valid
    private ProfileInfo profile;

    private List<@jakarta.validation.Valid ProblemInfo> solvedProblems;
    private List<@jakarta.validation.Valid SubmissionInfo> submissions;

    @jakarta.validation.Valid
    private ContestRankingInfo contestRanking;

    private List<@jakarta.validation.Valid ContestHistoryInfo> contestHistory;

    @Data
    public static class ProfileInfo {
        @Size(max = 100)
        private String realName;
        @Size(max = 500)
        private String userAvatar;
        @Min(0)
        private Integer ranking;
    }

    @Data
    public static class ProblemInfo {
        @Min(0)
        private Integer frontendQuestionId;
        @Size(max = 200)
        private String title;
        @Size(max = 200)
        private String titleSlug;
        @Size(max = 50)
        private String difficulty;
        private List<@jakarta.validation.Valid TagInfo> topicTags;
    }

    @Data
    public static class TagInfo {
        @Size(max = 100)
        private String name;
        @Size(max = 100)
        private String slug;
    }

    @Data
    public static class SubmissionInfo {
        @Size(max = 100)
        private String id;
        @Size(max = 200)
        private String title;
        @Size(max = 200)
        private String titleSlug;
        @Size(max = 50)
        private String timestamp;
        @Size(max = 100)
        private String statusDisplay;
        @Size(max = 50)
        private String lang;
        @Size(max = 50)
        private String runtime;
        @Size(max = 50)
        private String memory;
    }

    @Data
    public static class ContestRankingInfo {
        @Min(0)
        private Integer attendedContestsCount;
        @Min(0)
        private Double rating;
        @Min(0)
        private Integer globalRanking;
        @Min(0) @Max(100)
        private Double topPercentage;
    }

    @Data
    public static class ContestHistoryInfo {
        private Boolean attended;
        private Double rating;
        @Min(0)
        private Integer ranking;
        @Min(0)
        private Integer problemsSolved;
        @Min(0)
        private Integer totalProblems;
        @Min(0)
        private Integer finishTimeInSeconds;
        @jakarta.validation.Valid
        private ContestInfo contest;
    }

    @Data
    public static class ContestInfo {
        @Size(max = 200)
        private String title;
        @Size(max = 200)
        private String titleSlug;
        @Min(0)
        private Long startTime;
    }
}
