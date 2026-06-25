package com.algovault.service;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserContextService {
    private final UserRepository userRepository;

    @Transactional
    public User resolveUser(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof Long authenticatedUserId) {
            return userRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user no longer exists"));
        }

        String userId = firstNonBlank(request.getHeader("X-User-Id"), request.getParameter("userId"));
        if (userId != null) {
            try {
                return userRepository.findById(Long.parseLong(userId))
                    .orElseThrow(() -> new IllegalArgumentException("Unknown userId: " + userId));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid userId: " + userId);
            }
        }

        String username = firstNonBlank(
            request.getHeader("X-Leetcode-Username"),
            request.getHeader("X-Algovault-Username"),
            request.getParameter("username")
        );

        if (username == null) {
            throw new IllegalArgumentException("Missing user context. Send X-Leetcode-Username or userId.");
        }

        String normalized = username.trim();
        return userRepository.findByLcUsernameIgnoreCase(normalized)
            .orElseGet(() -> userRepository.save(User.builder()
                .githubId("leetcode:" + normalized.toLowerCase())
                .username(normalized)
                .lcUsername(normalized)
                .virtualRating(1500)
                .build()));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }
}
