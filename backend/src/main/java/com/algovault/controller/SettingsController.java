package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.model.UserSettings;
import com.algovault.repository.UserSettingsRepository;
import com.algovault.service.UserContextService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final UserSettingsRepository userSettingsRepository;
    private final UserContextService userContextService;

    @GetMapping
    public ResponseEntity<UserSettings> getSettings(HttpServletRequest request) {
        User user = userContextService.resolveUser(request);
        return userSettingsRepository.findByUserId(user.getId())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserSettings> updateSettings(HttpServletRequest request, @RequestBody Map<String, Object> preferences) {
        User user = userContextService.resolveUser(request);
        UserSettings settings = userSettingsRepository.findByUserId(user.getId())
            .orElseGet(() -> UserSettings.builder().user(user).build());

        settings.setPreferences(preferences);
        return ResponseEntity.ok(userSettingsRepository.save(settings));
    }
}
