package com.algovault.dto;
import lombok.Data;
import java.util.List;
@Data
public class SyncLeetcodeRequest {
    private String username;
    private ProfileInfo profile;
    private List<ProblemInfo> solvedProblems;
    private List<SubmissionInfo> submissions;
    private ContestRankingInfo contestRanking;
    private List<ContestHistoryInfo> contestHistory;

    @Data
    public static class ProfileInfo {
        private String realName;
        private String userAvatar;
        private Integer ranking;
    }

    @Data
    public static class ProblemInfo {
        private Integer frontendQuestionId;
        private String title;
        private String titleSlug;
        private String difficulty;
        private List<TagInfo> topicTags;
    }

    @Data
    public static class TagInfo {
        private String name;
        private String slug;
    }

    @Data
    public static class SubmissionInfo {
        private String id;
        private String title;
        private String titleSlug;
        private String timestamp;
        private String statusDisplay;
        private String lang;
        private String runtime;
        private String memory;
    }

    @Data
    public static class ContestRankingInfo {
        private Integer attendedContestsCount;
        private Double rating;
        private Integer globalRanking;
        private Double topPercentage;
    }

    @Data
    public static class ContestHistoryInfo {
        private Boolean attended;
        private Double rating;
        private Integer ranking;
        private Integer problemsSolved;
        private Integer totalProblems;
        private Integer finishTimeInSeconds;
        private ContestInfo contest;
    }

    @Data
    public static class ContestInfo {
        private String title;
        private String titleSlug;
        private Long startTime;
    }
}
