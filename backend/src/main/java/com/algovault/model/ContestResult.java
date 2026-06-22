package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "contest_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContestResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "contest_title", nullable = false)
    private String contestTitle;

    @Column(name = "contest_slug")
    private String contestSlug;

    @Column(name = "contest_date", nullable = false)
    private LocalDateTime contestDate;

    @Column(name = "rank")
    private Integer rank;

    @Column(name = "problems_solved")
    private Integer problemsSolved;

    @Column(name = "total_problems")
    private Integer totalProblems;

    @Column(name = "finish_time_secs")
    private Integer finishTimeSecs;

    @Column(name = "old_rating")
    private Double oldRating;

    @Column(name = "new_rating")
    private Double newRating;

    @Column(name = "rating_delta")
    private Double ratingDelta;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_details")
    private Map<String, Object> questionDetails;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
