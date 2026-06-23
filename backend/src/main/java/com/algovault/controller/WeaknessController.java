package com.algovault.controller;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.User;
import com.algovault.service.WeaknessService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weakness")
@RequiredArgsConstructor
public class WeaknessController {
    private final WeaknessService service;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<WeaknessResponse> getWeakness(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(service.getWeakness(user.getId()));
    }
}
