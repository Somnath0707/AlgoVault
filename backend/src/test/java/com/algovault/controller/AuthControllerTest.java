package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import com.algovault.service.JwtService;
import com.algovault.service.OAuthStateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OAuthStateService oauthStateService;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "githubClientId", "test-client-id");
        ReflectionTestUtils.setField(authController, "githubClientSecret", "test-client-secret");
    }

    @Test
    void authenticateGuest_createsNewUserWhenNotFound() {
        String deviceId = "12345678-abcd-ef01-2345-6789abcdef01";
        String guestId = "guest:" + deviceId;

        when(userRepository.findByGithubId(guestId)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(101L);
            return u;
        });
        when(jwtService.generateToken(101L, "guest_12345678")).thenReturn("mock-guest-jwt");

        var response = authController.authenticateGuest(new AuthController.GuestAuthRequest(deviceId));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("mock-guest-jwt", response.getBody().token());
        assertEquals("guest_12345678", response.getBody().username());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void authenticateGuest_reusesExistingGuest() {
        String deviceId = "12345678-abcd-ef01-2345-6789abcdef01";
        String guestId = "guest:" + deviceId;
        User existing = User.builder()
                .id(202L)
                .githubId(guestId)
                .username("guest_12345678")
                .virtualRating(1500)
                .build();

        when(userRepository.findByGithubId(guestId)).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(202L, "guest_12345678")).thenReturn("existing-jwt");

        var response = authController.authenticateGuest(new AuthController.GuestAuthRequest(deviceId));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("existing-jwt", response.getBody().token());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void authenticateGithubToken_upgradesGuestUser() {
        String deviceId = "test-device-uuid-1234";
        String guestId = "guest:" + deviceId;
        User guestUser = User.builder()
                .id(303L)
                .githubId(guestId)
                .username("guest_test-dev")
                .virtualRating(1500)
                .build();

        when(restTemplate.exchange(
                eq("https://api.github.com/user"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(ResponseEntity.ok(Map.of(
                "id", 999888,
                "login", "octocat",
                "avatar_url", "https://github.com/images/error/octocat_happy.gif"
        )));

        when(userRepository.findByGithubId("github:999888")).thenReturn(Optional.empty());
        when(userRepository.findByGithubId(guestId)).thenReturn(Optional.of(guestUser));
        when(userRepository.save(guestUser)).thenReturn(guestUser);
        when(jwtService.generateToken(303L, "octocat")).thenReturn("upgraded-jwt");

        var response = authController.authenticateGithubToken(
                new AuthController.GithubTokenRequest("valid-gh-token", deviceId),
                null
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals("github:999888", guestUser.getGithubId());
        assertEquals("octocat", guestUser.getUsername());
        verify(userRepository).save(guestUser);
    }

    @Test
    void authenticateGithubToken_usesExistingGithubUserIfAlreadyPresent() {
        User existingGhUser = User.builder()
                .id(404L)
                .githubId("github:555444")
                .username("existingoctocat")
                .build();

        when(restTemplate.exchange(
                eq("https://api.github.com/user"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(Map.class)
        )).thenReturn(ResponseEntity.ok(Map.of(
                "id", 555444,
                "login", "existingoctocat"
        )));

        when(userRepository.findByGithubId("github:555444")).thenReturn(Optional.of(existingGhUser));
        when(userRepository.save(existingGhUser)).thenReturn(existingGhUser);
        when(jwtService.generateToken(404L, "existingoctocat")).thenReturn("gh-jwt");

        var response = authController.authenticateGithubToken(
                new AuthController.GithubTokenRequest("valid-gh-token", "some-device"),
                null
        );

        assertEquals(200, response.getStatusCode().value());
        verify(jwtService).generateToken(404L, "existingoctocat");
    }

    @Test
    void getMe_unauthorizedWhenUserIdNull() {
        var response = authController.getMe(null);
        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void guestAuthRequest_validationFailsOnInvalidDeviceId() {
        var validator = jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator();
        var invalidShort = new AuthController.GuestAuthRequest("short");
        var invalidChars = new AuthController.GuestAuthRequest("bad device id with spaces!");
        var valid = new AuthController.GuestAuthRequest("12345678-abcd-ef01-2345-6789abcdef01");

        assertFalse(validator.validate(invalidShort).isEmpty());
        assertFalse(validator.validate(invalidChars).isEmpty());
        assertTrue(validator.validate(valid).isEmpty());
    }

    @Test
    void logout_revokesBearerToken() {
        var response = authController.logout("Bearer test-token-xyz");
        assertEquals(204, response.getStatusCode().value());
        verify(jwtService).revokeToken("test-token-xyz");
    }
}
