package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.model.VaultEntry;
import com.algovault.service.VaultService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vault")
@RequiredArgsConstructor
public class VaultController {

    private final VaultService vaultService;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<VaultEntry>> getVault(HttpServletRequest request, @RequestParam(required = false) String query) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(vaultService.searchVault(user.getId(), query));
    }

    @PostMapping
    public ResponseEntity<VaultEntry> saveEntry(HttpServletRequest request, @RequestBody @jakarta.validation.Valid VaultEntry entry) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(vaultService.saveEntry(user.getId(), entry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(HttpServletRequest request, @PathVariable Long id) {
        User user = userContextService.resolveUser(request);
        vaultService.deleteEntry(user.getId(), id);
        return ResponseEntity.ok().build();
    }
}
