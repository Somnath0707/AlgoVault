package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import com.algovault.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void extensionLogin_whenOAuthMode_returns403() {
        ReflectionTestUtils.setField(authController, "authMode", "oauth");

        Map<String, String> request = new HashMap<>();
        request.put("username", "testuser");

        ResponseEntity<?> response = authController.extensionLogin(request);

        assertEquals(403, response.getStatusCode().value());
        assertEquals("Extension login bypass is disabled. OAuth required.", response.getBody());
    }

    @Test
    void extensionLogin_whenSingleUserMode_returnsToken() {
        ReflectionTestUtils.setField(authController, "authMode", "single-user");

        String username = "testuser";
        User user = User.builder().id(123L).username(username).lcUsername(username).build();
        
        when(userRepository.findByLcUsernameIgnoreCase(username)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(123L, username)).thenReturn("dummy-jwt-token");

        Map<String, String> request = new HashMap<>();
        request.put("username", username);

        ResponseEntity<?> response = authController.extensionLogin(request);

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("dummy-jwt-token", body.get("token"));
    }
}
