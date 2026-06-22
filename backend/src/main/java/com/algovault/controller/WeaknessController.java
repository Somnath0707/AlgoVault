package com.algovault.controller;

import com.algovault.dto.WeaknessResponse;
import com.algovault.service.WeaknessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weakness")
@RequiredArgsConstructor
public class WeaknessController {
    private final WeaknessService service;

    @GetMapping
    public ResponseEntity<WeaknessResponse> getWeakness() {
        Long userId = 1L; // Temporary mock extraction
        return ResponseEntity.ok(service.getWeakness(userId));
    }
}
