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
@org.springframework.transaction.annotation.Transactional
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
        throw new IllegalArgumentException("Unauthorized: Missing user authentication context");
    }

}
