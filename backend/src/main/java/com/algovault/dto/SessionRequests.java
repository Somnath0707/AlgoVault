package com.algovault.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

public class SessionRequests {
    @Data
    public static class StartSessionRequest {
        @Size(max = 50)
        private String mode;
    }

    @Data
    public static class EventRequest {
        @NotBlank
        @Size(max = 100)
        private String eventType;
        @NotBlank
        @Size(max = 200)
        private String titleSlug;
        @NotBlank
        @Size(max = 200)
        private String title;
        private LocalDateTime timestamp;
        private Map<String, Object> metadata;
    }

    @Data
    public static class SubmissionResultRequest {
        @Size(max = 100)
        private String submissionId;
        @NotBlank
        @Size(max = 200)
        private String titleSlug;
        @NotBlank
        @Size(max = 200)
        private String title;
        @NotBlank
        @Size(max = 100)
        private String statusDisplay;
        @Min(0)
        private Integer statusCode;
        @Size(max = 50)
        private String language;
        @Min(0)
        private Integer runtimeMs;
        @Min(0)
        private Integer memoryKb;
        @Min(0)
        private Integer totalCorrect;
        @Min(0)
        private Integer totalTestcases;
        private LocalDateTime submittedAt;
    }

    @Data
    public static class HeartbeatRequest {
        @NotBlank
        @Size(max = 200)
        private String titleSlug;
        @NotBlank
        @Size(max = 200)
        private String title;
        @Min(0)
        private Integer focusSeconds;
        @Min(0)
        private Integer tabSwitches;
        @Min(0)
        private Integer pasteCount;
        @Min(0)
        private Integer problemFocusSeconds;
        @Min(0)
        private Integer problemTabSwitches;
        @Min(0)
        private Integer problemPasteCount;
        private LocalDateTime openedAt;
        @Size(max = 100)
        private String heartbeatEpoch;
    }

    @Data
    public static class SelfReportRequest {
        @NotBlank
        @Size(max = 200)
        private String titleSlug;
        @NotBlank
        @Size(max = 50)
        private String helpType;
    }
}
