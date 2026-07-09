package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "revision_cards")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionCard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;
    
    private Integer confidence; // 1-5
    @Column(name = "interval_days")
    private Double intervalDays;
    @Column(name = "ease_factor")
    private Double easeFactor;
    
    @Column(name = "next_review")
    private LocalDateTime nextReview;
    @Column(name = "last_reviewed")
    private LocalDateTime lastReviewed;
    
    @Column(name = "review_count")
    private Integer reviewCount;
}
