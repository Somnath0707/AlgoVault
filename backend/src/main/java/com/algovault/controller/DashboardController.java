package com.algovault.controller;

import com.algovault.dto.DashboardResponse;
import com.algovault.model.User;
import com.algovault.service.DashboardService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService service;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(service.getDashboard(user.getId()));
    }
}
