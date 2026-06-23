package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.service.ExportService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final UserContextService userContextService;

    @GetMapping("/json")
    public ResponseEntity<Map<String, Object>> exportJson(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        Map<String, Object> data = exportService.exportAllUserData(user.getId());
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"algovault_export.json\"")
                .body(data);
    }
}
