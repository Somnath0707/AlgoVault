package com.algovault.controller;

import com.algovault.dto.RevisionResponse;
import com.algovault.model.User;
import com.algovault.service.RevisionService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/revision")
@RequiredArgsConstructor
public class RevisionController {

    public record ReviewRequest(@NotNull @Min(0) @Max(5) Integer quality) {}

    private final RevisionService revisionService;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<RevisionResponse>> getQueue(HttpServletRequest request,
            @RequestParam(required = false) Integer solvedWithinDays) {
        if (solvedWithinDays != null && (solvedWithinDays < 1 || solvedWithinDays > 3650)) {
            return ResponseEntity.badRequest().build();
        }
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(revisionService.getQueue(user.getId(), solvedWithinDays));
    }

    public ResponseEntity<List<RevisionResponse>> getQueue(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(revisionService.getQueue(user.getId()));
    }

    @PostMapping("/{cardId}")
    public ResponseEntity<Map<String, String>> reviewCard(HttpServletRequest request, @PathVariable Long cardId,
            @Valid @RequestBody ReviewRequest body) {
        User user = userContextService.resolveUser(request);
        revisionService.reviewCard(user.getId(), cardId, body.quality());
        return ResponseEntity.ok(Map.of("status", "success"));
    }
}
