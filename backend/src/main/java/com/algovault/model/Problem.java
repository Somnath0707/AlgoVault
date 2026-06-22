package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "problems")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Problem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "frontend_id")
    private Integer frontendId;

    @Column(nullable = false)
    private String title;

    @Column(name = "title_slug", nullable = false, unique = true)
    private String titleSlug;

    private String difficulty;

    @Column(name = "actual_rating")
    private Double actualRating;

    @Type(ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> tags;

    @Column(name = "acceptance_rate")
    private Double acceptanceRate;

    @Column(name = "contest_slug")
    private String contestSlug;

    @Column(name = "problem_index")
    private String problemIndex;

    @Column(name = "is_premium")
    private Boolean isPremium;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
