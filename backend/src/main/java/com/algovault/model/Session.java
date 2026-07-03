package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String mode;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "problems_attempted")
    private Integer problemsAttempted;

    @Column(name = "problems_solved")
    private Integer problemsSolved;

    @Column(name = "focus_seconds")
    private Integer focusSeconds;

    @Column(name = "tab_switches")
    private Integer tabSwitches;

    @Column(name = "paste_count")
    private Integer pasteCount;

    @Column(name = "focus_score")
    private Integer focusScore;

    @Column(name = "last_heartbeat_epoch")
    private String lastHeartbeatEpoch;

    @Column(name = "accumulated_focus_seconds")
    private Integer accumulatedFocusSeconds;

    @Column(name = "accumulated_tab_switches")
    private Integer accumulatedTabSwitches;

    @Column(name = "accumulated_paste_count")
    private Integer accumulatedPasteCount;
}
