package com.algovault.controller;

import com.algovault.model.TagMastery;
import com.algovault.service.MasteryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mastery")
@RequiredArgsConstructor
public class MasteryController {
    private final MasteryService service;

    @GetMapping
    public ResponseEntity<List<TagMastery>> getMastery() {
        Long userId = 1L; // Temporary mock extraction
        return ResponseEntity.ok(service.getMastery(userId));
    }
}
