package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "problem_open_events")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemOpenEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;
    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;
    @Column(name = "closed_at")
    private LocalDateTime closedAt;
    @Column(name = "focus_seconds")
    private Integer focusSeconds;
    @Column(name = "tab_switches")
    private Integer tabSwitches;
    @Column(name = "paste_count")
    private Integer pasteCount;
    @Column(name = "focus_score")
    private Integer focusScore;
    @Column(name = "self_reported_help")
    private String selfReportedHelp;
    private Boolean solved;
    @Column(name = "attempts_during_session")
    private Integer attemptsDuringSession;
}
