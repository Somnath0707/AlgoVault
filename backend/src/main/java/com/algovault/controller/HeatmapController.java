package com.algovault.controller;

import com.algovault.model.UserRatingBucket;
import com.algovault.service.HeatmapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/heatmap")
@RequiredArgsConstructor
public class HeatmapController {
    private final HeatmapService service;

    @GetMapping
    public ResponseEntity<List<UserRatingBucket>> getHeatmap() {
        Long userId = 1L; // Temporary mock extraction
        return ResponseEntity.ok(service.getHeatmap(userId));
    }
}
