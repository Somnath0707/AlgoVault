package com.algovault.dto;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class RevisionResponse {
    private Long id;
    private String title;
    private String titleSlug;
    private Integer confidence;
    private Double intervalDays;
    private LocalDateTime nextReview;
    private LocalDateTime lastReviewed;
    private Integer reviewCount;
}
