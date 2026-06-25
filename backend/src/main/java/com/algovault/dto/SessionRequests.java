package com.algovault.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

public class SessionRequests {
    @Data
    public static class StartSessionRequest {
        private String mode;
    }

    @Data
    public static class EventRequest {
        private String eventType;
        private String titleSlug;
        private String title;
        private LocalDateTime timestamp;
        private Map<String, Object> metadata;
    }

    @Data
    public static class SubmissionResultRequest {
        private String submissionId;
        private String titleSlug;
        private String title;
        private String statusDisplay;
        private Integer statusCode;
        private String language;
        private Integer runtimeMs;
        private Integer memoryKb;
        private Integer totalCorrect;
        private Integer totalTestcases;
        private LocalDateTime submittedAt;
    }

    @Data
    public static class HeartbeatRequest {
        private String titleSlug;
        private String title;
        private Integer focusSeconds;
        private Integer tabSwitches;
        private Integer pasteCount;
        private Integer problemFocusSeconds;
        private Integer problemTabSwitches;
        private Integer problemPasteCount;
        private LocalDateTime openedAt;
    }

    @Data
    public static class SelfReportRequest {
        private String titleSlug;
        private String helpType;
    }
}
