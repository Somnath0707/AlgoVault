package com.algovault.controller;

import com.algovault.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {
    private final ExportService exportService;

    @GetMapping("/json")
    public ResponseEntity<Map<String, Object>> exportJson() {
        Long userId = 1L; // Temporary mock extraction
        Map<String, Object> data = exportService.exportAllUserData(userId);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"algovault_export.json\"")
                .body(data);
    }
}
