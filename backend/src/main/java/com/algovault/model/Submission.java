package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    @Column(nullable = false)
    private String verdict;

    private String language;

    @Column(name = "runtime_ms")
    private Integer runtimeMs;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "is_contest")
    private Boolean isContest;

    @Column(name = "contest_slug")
    private String contestSlug;

    @Column(name = "attempt_number")
    private Integer attemptNumber;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
