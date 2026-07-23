package com.algovault.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PotdResponse {
    private String titleSlug;
    private String title;
    private Double rating;
    private List<String> tags;
    private String reason;
    private String type; // WARMUP, WEAKNESS, STRETCH
}
