package com.algovault.controller;

import com.algovault.model.UserRatingBucket;
import com.algovault.model.User;
import com.algovault.service.HeatmapService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/heatmap")
@RequiredArgsConstructor
public class HeatmapController {
    private final HeatmapService service;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<UserRatingBucket>> getHeatmap(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(service.getHeatmap(user.getId()));
    }
}
