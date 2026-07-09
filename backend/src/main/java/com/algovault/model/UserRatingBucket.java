package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_rating_buckets")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRatingBucket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @com.fasterxml.jackson.annotation.JsonIgnore
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
