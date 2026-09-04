package com.algovault.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.data.redis.core.RedisTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
public class JwtService {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}") // one hour by default; bounded below
    private long expiration;

    @Value("${jwt.issuer}")
    private String issuer;

    @Value("${jwt.audience}")
    private String audience;

    @jakarta.annotation.PostConstruct
    public void validateSecrets() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be set and contain at least 32 bytes");
        }
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalStateException("JWT issuer and audience must be configured");
        }
        if (expiration < 300_000L || expiration > 86_400_000L) {
            throw new IllegalStateException("JWT expiration must be between 5 minutes and 24 hours");
        }
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Long userId, String username) {
        return Jwts.builder()
                .subject(userId.toString())
                .issuer(issuer)
                .audience().add(audience).and()
                .id(UUID.randomUUID().toString())
                .claim("username", username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * JWTs are stateless, so logout keeps the token id in Redis until it would
     * naturally expire. This also makes an explicit logout effective if a
     * device is lost.
     */
    public void revokeToken(String token) {
        Claims claims = extractAllClaims(token);
        String tokenId = claims.getId();
        Date expirationDate = claims.getExpiration();
        if (tokenId == null || expirationDate == null) return;
        long remainingMs = expirationDate.getTime() - System.currentTimeMillis();
        if (remainingMs > 0) {
            redisTemplate.opsForValue().set("auth:revoked:" + tokenId, Boolean.TRUE, Duration.ofMillis(remainingMs));
        }
    }

    public boolean isTokenRevoked(String token) {
        try {
            String tokenId = extractAllClaims(token).getId();
            if (tokenId == null) return false;
            return Boolean.TRUE.equals(redisTemplate.opsForValue().get("auth:revoked:" + tokenId));
        } catch (Exception e) {
            log.warn("Redis revocation check unavailable, failing open for cryptographically valid token: {}", e.getMessage());
            return false;
        }
    }

    public Long extractUserId(String token) {
        return Long.parseLong(extractAllClaims(token).getSubject());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
