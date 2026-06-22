package com.algovault.controller;

import com.algovault.dto.*;
import com.algovault.model.VaultEntry;
import com.algovault.service.*;
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

    @GetMapping("/potd")
    public ResponseEntity<List<PotdResponse>> getPotd() {
        return ResponseEntity.ok(potdService.getPotd(1L));
    }

    @GetMapping("/revision/queue")
    public ResponseEntity<List<RevisionResponse>> getRevisionQueue() {
        return ResponseEntity.ok(revisionService.getQueue(1L));
    }

    @PostMapping("/revision/{id}/review")
    public ResponseEntity<?> reviewCard(@PathVariable Long id, @RequestBody Map<String, Integer> payload) {
        revisionService.reviewCard(1L, id, payload.getOrDefault("quality", 3));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/contests")
    public ResponseEntity<List<ContestAnalysisResponse>> getContests() {
        return ResponseEntity.ok(contestService.getContestHistory(1L));
    }

    @GetMapping("/vault")
    public ResponseEntity<List<VaultEntry>> getVault() {
        return ResponseEntity.ok(vaultService.searchVault(1L, ""));
    }

    @GetMapping("/vault/search")
    public ResponseEntity<List<VaultEntry>> searchVault(@RequestParam String q) {
        return ResponseEntity.ok(vaultService.searchVault(1L, q));
    }

    @PostMapping("/vault")
    public ResponseEntity<VaultEntry> createVaultEntry(@RequestBody VaultEntry entry) {
        return ResponseEntity.ok(vaultService.saveEntry(1L, entry));
    }
}
