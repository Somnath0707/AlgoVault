package com.algovault.controller;

import com.algovault.service.EntrantHubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/entranthub")
@RequiredArgsConstructor
public class EntrantHubController {
    private final EntrantHubService entrantHubService;

    @GetMapping("/history")
    public ResponseEntity<String> getHistory(
            @RequestParam String username,
            @RequestParam(defaultValue = "US") String region) {
        String json = entrantHubService.fetchHistory(username, region);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(json);
    }


    @GetMapping("/upcoming")
    public ResponseEntity<String> getUpcoming() {
        String json = entrantHubService.fetchUpcoming();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(json);
    }
}
