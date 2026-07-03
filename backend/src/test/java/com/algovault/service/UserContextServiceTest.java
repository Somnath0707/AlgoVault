package com.algovault.service;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserContextServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private UserContextService userContextService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolveUser_withNoAuthentication_throwsException() {
        // Even with user-asserted headers, resolveUser must throw when unauthenticated
        when(request.getHeader("X-User-Id")).thenReturn("1");
        when(request.getHeader("X-Leetcode-Username")).thenReturn("testuser");

        assertThrows(IllegalArgumentException.class, () -> userContextService.resolveUser(request));
    }

    @Test
    void resolveUser_withAuthenticatedUser_returnsUser() {
        Long userId = 1L;
        User user = User.builder().id(userId).username("testuser").build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userId, null, new ArrayList<>());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        User resolved = userContextService.resolveUser(request);

        assertNotNull(resolved);
        assertEquals(userId, resolved.getId());
        assertEquals("testuser", resolved.getUsername());
    }

    @Test
    void resolveUser_withAuthenticatedUserMissingInDb_throwsException() {
        Long userId = 1L;
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userId, null, new ArrayList<>());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> userContextService.resolveUser(request));
    }
}
