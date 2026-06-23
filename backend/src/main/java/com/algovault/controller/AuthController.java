package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import com.algovault.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @GetMapping("/success")
    public ResponseEntity<?> oauthSuccess(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.badRequest().body("OAuth Login Failed");
        }
        
        String githubLogin = oauth2User.getAttribute("login");
        String avatarUrl = oauth2User.getAttribute("avatar_url");
        String githubIdStr = "github:" + oauth2User.getAttribute("id");
        
        User user = userRepository.findByGithubId(githubIdStr).orElseGet(() -> {
            User newUser = User.builder()
                .githubId(githubIdStr)
                .username(githubLogin)
                .avatarUrl(avatarUrl)
                .virtualRating(1500)
                .build();
            return userRepository.save(newUser);
        });

        String token = jwtService.generateToken(user.getId(), user.getUsername());
        
        return ResponseEntity.ok(Map.of(
            "token", token,
            "user", user
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@AuthenticationPrincipal Long userId) {
        if (userId == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        return userRepository.findById(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
