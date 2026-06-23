package com.algovault.controller;

import com.algovault.dto.*;
import com.algovault.model.User;
import com.algovault.model.VaultEntry;
import com.algovault.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class IntelligenceControllers {

    private final PotdService potdService;
    private final RevisionService revisionService;
    private final ContestAnalyzerService contestService;
    private final VaultService vaultService;
    private final UserContextService userContextService;

    @GetMapping("/potd")
    public ResponseEntity<List<PotdResponse>> getPotd(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(potdService.getPotd(user.getId()));
    }

    @GetMapping("/revision/queue")
    public ResponseEntity<List<RevisionResponse>> getRevisionQueue(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(revisionService.getQueue(user.getId()));
    }

    @PostMapping("/revision/{id}/review")
    public ResponseEntity<?> reviewCard(HttpServletRequest request, @PathVariable Long id, @RequestBody Map<String, Integer> payload) {
        User user = userContextService.resolveUser(request);
        revisionService.reviewCard(user.getId(), id, payload.getOrDefault("quality", 3));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/contests")
    public ResponseEntity<List<ContestAnalysisResponse>> getContests(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(contestService.getContestHistory(user.getId()));
    }

    @GetMapping("/vault")
    public ResponseEntity<List<VaultEntry>> getVault(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(vaultService.searchVault(user.getId(), ""));
    }

    @GetMapping("/vault/search")
    public ResponseEntity<List<VaultEntry>> searchVault(HttpServletRequest request, @RequestParam String q) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(vaultService.searchVault(user.getId(), q));
    }

    @PostMapping("/vault")
    public ResponseEntity<VaultEntry> createVaultEntry(HttpServletRequest request, @RequestBody VaultEntry entry) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(vaultService.saveEntry(user.getId(), entry));
    }
}
