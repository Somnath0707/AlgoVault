package com.algovault.controller;

import com.algovault.dto.RevisionResponse;
import com.algovault.model.User;
import com.algovault.service.RevisionService;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/revision")
@RequiredArgsConstructor
public class RevisionController {

    private final RevisionService revisionService;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<List<RevisionResponse>> getQueue(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return ResponseEntity.ok(revisionService.getQueue(user.getId()));
    }

    @PostMapping("/{cardId}")
    public ResponseEntity<Void> reviewCard(HttpServletRequest request, @PathVariable Long cardId, @RequestBody Map<String, Integer> body) {
        User user = userContextService.resolveUser(request);
        int quality = body != null && body.containsKey("quality") ? body.get("quality") : 4;
        revisionService.reviewCard(user.getId(), cardId, quality);
        return ResponseEntity.ok().build();
    }
}
