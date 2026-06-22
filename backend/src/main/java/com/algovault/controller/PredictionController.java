package com.algovault.controller;

import com.algovault.dto.PredictionResponse;
import com.algovault.service.SolveProbabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
public class PredictionController {
    private final SolveProbabilityService service;

    @GetMapping("/{titleSlug}")
    public ResponseEntity<PredictionResponse> getPrediction(@PathVariable String titleSlug) {
        Long userId = 1L; // Temporary mock extraction
        return ResponseEntity.ok(service.predict(userId, titleSlug));
    }
}
