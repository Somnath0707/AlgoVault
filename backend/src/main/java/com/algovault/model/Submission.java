package com.algovault.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    @Column(name = "leetcode_submission_id")
    private String leetcodeSubmissionId;

    @Column(nullable = false)
    private String verdict;

    private String language;

    @Column(name = "runtime_ms")
    private Integer runtimeMs;

    @Column(name = "memory_kb")
    private Integer memoryKb;

    @Column(name = "total_correct")
    private Integer totalCorrect;

    @Column(name = "total_testcases")
    private Integer totalTestcases;

    @Column(name = "source")
    private String source;

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
