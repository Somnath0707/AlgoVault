package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tag_mastery")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagMastery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String tag;

    @Column(name = "total_attempted")
    private Integer totalAttempted;

    @Column(name = "total_solved")
    private Integer totalSolved;

    @Column(name = "first_ac_count")
    private Integer firstAcCount;

    @Column(name = "success_rate")
    private Double successRate;

    @Column(name = "avg_solve_time")
    private Double avgSolveTime;

    @Column(name = "mastery_score")
    private Double masteryScore;

    @Column(name = "rd")
    private Double rd;

    @Column(name = "volatility")
    private Double volatility;

    @Column(name = "last_solved_at")
    private LocalDateTime lastSolvedAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
