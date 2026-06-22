package com.algovault.controller;
import com.algovault.dto.SyncLeetcodeRequest;
import com.algovault.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
// import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {
    private final SyncService syncService;

    @PostMapping("/leetcode")
    public ResponseEntity<?> syncLeetcode(@RequestBody SyncLeetcodeRequest request) {
        // Extract userId from JWT/SecurityContext in production.
        // Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = 1L; // Using 1L temporarily to allow compilation without full Spring Security configuration
        
        try {
            syncService.syncLeetcode(userId, request);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Data synchronized successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
