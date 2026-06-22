package com.algovault.controller;

import com.algovault.dto.DashboardResponse;
import com.algovault.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService service;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard() {
        Long userId = 1L; // Temporary mock extraction
        return ResponseEntity.ok(service.getDashboard(userId));
    }
}
