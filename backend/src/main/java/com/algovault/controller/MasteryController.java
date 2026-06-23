package com.algovault.controller;

import com.algovault.model.TagMastery;
import com.algovault.model.User;
import com.algovault.service.MasteryService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mastery")
@RequiredArgsConstructor
public class MasteryController {
    private final MasteryService service;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<TagMastery>> getMastery(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(service.getMastery(user.getId()));
    }
}
