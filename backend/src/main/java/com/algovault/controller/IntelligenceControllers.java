package com.algovault.controller;

import com.algovault.dto.*;
import com.algovault.model.User;
import com.algovault.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class IntelligenceControllers {

    private final PotdService potdService;
    private final ContestAnalyzerService contestService;
    private final UserContextService userContextService;

    @GetMapping("/potd")
    public ResponseEntity<List<PotdResponse>> getPotd(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(potdService.getPotd(user.getId()));
    }

    @GetMapping("/contests")
    public ResponseEntity<List<ContestAnalysisResponse>> getContests(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(contestService.getContestHistory(user.getId()));
    }
}
