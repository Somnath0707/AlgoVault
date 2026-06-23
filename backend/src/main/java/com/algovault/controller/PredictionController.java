package com.algovault.controller;

import com.algovault.dto.PredictionResponse;
import com.algovault.model.User;
import com.algovault.service.SolveProbabilityService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predict")
@RequiredArgsConstructor
public class PredictionController {
    private final SolveProbabilityService service;
    private final UserContextService userContextService;

    @GetMapping("/{titleSlug}")
    public ResponseEntity<PredictionResponse> getPrediction(HttpServletRequest request, @PathVariable String titleSlug) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(service.predict(user.getId(), titleSlug));
    }
}
