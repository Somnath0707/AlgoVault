package com.algovault.controller;

import com.algovault.dto.WeaknessResponse;
import com.algovault.model.User;
import com.algovault.service.WeaknessService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.cache.annotation.CacheEvict;

@RestController
@RequestMapping("/api/weakness")
@RequiredArgsConstructor
public class WeaknessController {
    private final WeaknessService service;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<WeaknessResponse> getWeakness(HttpServletRequest request, @RequestParam(required = false, defaultValue = "false") boolean refresh) {
        User user = userContextService.resolveUser(request);
        if (refresh) {
            service.evictWeaknessCache(user.getId());
        }
        return ResponseEntity.ok(service.getWeakness(user.getId()));
    }
}
