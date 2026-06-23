package com.algovault.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionResponse {
    private Long id;
    private String mode;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer problemsAttempted;
    private Integer problemsSolved;
    private Integer focusSeconds;
    private Integer tabSwitches;
    private Integer pasteCount;
    private Integer focusScore;
}
