package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sync_metadata")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncMetadata {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    @Column(name = "last_sync_time")
    private LocalDateTime lastSyncTime;
    @Column(name = "total_problems")
    private Integer totalProblems;
    @Column(name = "total_submissions")
    private Integer totalSubmissions;
    @Column(name = "total_contests")
    private Integer totalContests;
    @Column(name = "last_contest_sync")
    private LocalDateTime lastContestSync;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
