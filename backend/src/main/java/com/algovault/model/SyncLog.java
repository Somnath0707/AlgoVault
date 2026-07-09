package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;
    @Column(name = "finished_at")
    private LocalDateTime finishedAt;
    @Column(nullable = false)
    private String status;
    @Column(name = "new_problems")
    private Integer newProblems;
    @Column(name = "new_submissions")
    private Integer newSubmissions;
    @Column(name = "new_contests")
    private Integer newContests;
    @Column(name = "duration_ms")
    private Long durationMs;
    @Column(name = "error_message")
    private String errorMessage;
}
