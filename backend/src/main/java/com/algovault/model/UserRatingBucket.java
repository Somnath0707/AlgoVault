package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_rating_buckets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRatingBucket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(name = "bucket_rating", nullable = false)
    private Integer bucketRating;
    private Integer attempted;
    private Integer solved;
    @Column(name = "first_ac_count")
    private Integer firstAcCount;
    @Column(name = "avg_attempts")
    private Double avgAttempts;
    @Column(name = "avg_solve_time")
    private Double avgSolveTime;
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
