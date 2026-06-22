package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "analytics_metrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;
    
    @Column(name = "predicted_probability", nullable = false)
    private Double predictedProbability;
    
    @Column(name = "actual_result")
    private Boolean actualResult;
    
    @Column(name = "problem_rating")
    private Double problemRating;
    
    private String tags;
    private String confidence;
    
    @Column(name = "predicted_at", insertable = false, updatable = false)
    private LocalDateTime predictedAt;
    
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
