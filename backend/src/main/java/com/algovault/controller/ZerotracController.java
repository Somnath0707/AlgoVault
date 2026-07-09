package com.algovault.controller;

import com.algovault.service.ZerotracService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/metadata")
@RequiredArgsConstructor
public class ZerotracController {

    private final ZerotracService zerotracService;

    @GetMapping("/zerotrac-ratings")
    public ResponseEntity<Map<String, ZerotracService.ZerotracInfo>> getZerotracRatings() {
        return ResponseEntity.ok(zerotracService.getFullRatings());
    }
}
