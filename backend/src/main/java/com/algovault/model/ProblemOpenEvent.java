package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "problem_open_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemOpenEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;
    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;
    @Column(name = "closed_at")
    private LocalDateTime closedAt;
    @Column(name = "focus_seconds")
    private Integer focusSeconds;
    private Boolean solved;
    @Column(name = "attempts_during_session")
    private Integer attemptsDuringSession;
}
