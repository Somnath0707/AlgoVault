package com.algovault.controller;

import com.algovault.model.User;
import com.algovault.repository.UserRepository;
import com.algovault.service.JwtService;
import com.algovault.service.OAuthStateService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * OAuth is the only production account-creation path. A LeetCode username is
 * public information, so it is deliberately never accepted as authentication.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final OAuthStateService oauthStateService;
    private final RestTemplate restTemplate;

    @Value("${github.oauth.client-id}")
    private String githubClientId;

    @Value("${github.oauth.client-secret}")
    private String githubClientSecret;

    @jakarta.annotation.PostConstruct
    void validateOAuthConfiguration() {
        if (githubClientId == null || githubClientId.isBlank() || githubClientSecret == null || githubClientSecret.isBlank()) {
            throw new IllegalStateException("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured");
        }
    }

    public record OAuthStateResponse(String state) {}
    public record GithubExchangeRequest(
        @NotBlank @Size(max = 300) String code,
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String state,
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9._~-]{43,128}$") String codeVerifier,
        @NotBlank @Pattern(regexp = "^https://[a-p]{32}\\.chromiumapp\\.org/$") String redirectUri
    ) {}
    public record GithubTokenRequest(@NotBlank @Size(max = 500) String token) {}
    public record GithubExchangeResponse(String token, String githubToken, String username) {}

    @GetMapping("/github-state")
    public ResponseEntity<OAuthStateResponse> githubState() {
        return ResponseEntity.ok(new OAuthStateResponse(oauthStateService.issue()));
    }

    @PostMapping("/github-exchange")
    public ResponseEntity<?> exchangeGithubCode(@Valid @RequestBody GithubExchangeRequest request) {
        if (!oauthStateService.consume(request.state())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OAuth state"));
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(
                "https://github.com/login/oauth/access_token",
                new org.springframework.http.HttpEntity<>(Map.of(
                    "client_id", githubClientId,
                    "client_secret", githubClientSecret,
                    "code", request.code(),
                    "code_verifier", request.codeVerifier(),
                    "redirect_uri", request.redirectUri()
                ), headers),
                Map.class
            );
            String githubToken = tokenResponse.getBody() == null ? null : (String) tokenResponse.getBody().get("access_token");
            if (githubToken == null || githubToken.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "GitHub did not grant an access token"));
            }

            return ResponseEntity.ok(authenticateGithubToken(githubToken));
        } catch (HttpClientErrorException.Unauthorized exception) {
            return ResponseEntity.status(401).body(Map.of("error", "GitHub authorization was rejected"));
        } catch (HttpClientErrorException.Forbidden exception) {
            return ResponseEntity.status(503).body(Map.of("error", "GitHub temporarily denied authorization; retry shortly"));
        } catch (ResourceAccessException exception) {
            return ResponseEntity.status(503).body(Map.of("error", "GitHub authorization is temporarily unavailable"));
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(Map.of("error", "GitHub authorization could not be verified"));
        }
    }

    /**
     * Optional path for a user-created, fine-grained PAT. The token is used
     * once to verify the GitHub identity and is never written to our database.
     */
    @PostMapping("/github-token")
    public ResponseEntity<?> authenticateGithubToken(@Valid @RequestBody GithubTokenRequest request) {
        try {
            return ResponseEntity.ok(authenticateGithubToken(request.token()));
        } catch (HttpClientErrorException.Unauthorized exception) {
            // Only GitHub's 401 proves the credential is invalid. A 403 is
            // commonly a rate limit or a missing fine-grained-token scope.
            return ResponseEntity.status(401).body(Map.of("error", "GitHub token was rejected"));
        } catch (HttpClientErrorException.Forbidden exception) {
            return ResponseEntity.status(503).body(Map.of("error", "GitHub temporarily denied verification; retry shortly"));
        } catch (ResourceAccessException exception) {
            return ResponseEntity.status(503).body(Map.of("error", "GitHub verification is temporarily unavailable"));
        } catch (Exception exception) {
            return ResponseEntity.status(502).body(Map.of("error", "GitHub token verification failed"));
        }
    }

    private GithubExchangeResponse authenticateGithubToken(String githubToken) {
        HttpHeaders githubHeaders = new HttpHeaders();
        githubHeaders.setBearerAuth(githubToken);
        githubHeaders.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));
        ResponseEntity<Map> profileResponse = restTemplate.exchange(
            "https://api.github.com/user", org.springframework.http.HttpMethod.GET,
            new org.springframework.http.HttpEntity<>(githubHeaders), Map.class
        );
        Map profile = profileResponse.getBody();
        Object rawId = profile == null ? null : profile.get("id");
        String login = profile == null ? null : (String) profile.get("login");
        if (rawId == null || login == null || login.isBlank()) {
            throw new IllegalArgumentException("Could not verify GitHub identity");
        }
        String githubId = "github:" + rawId;
        String avatarUrl = profile.get("avatar_url") instanceof String avatar ? avatar : null;
        User user = userRepository.findByGithubId(githubId).orElseGet(() -> userRepository.save(User.builder()
            .githubId(githubId).username(login).avatarUrl(avatarUrl).virtualRating(1500).build()));
        return new GithubExchangeResponse(jwtService.generateToken(user.getId(), user.getUsername()), githubToken, user.getUsername());
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@org.springframework.security.core.annotation.AuthenticationPrincipal Long userId) {
        if (userId == null) return ResponseEntity.status(401).build();
        return userRepository.findById(userId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        jwtService.revokeToken(authorization.substring(7));
        return ResponseEntity.noContent().build();
    }
}
