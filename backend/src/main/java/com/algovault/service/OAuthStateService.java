package com.algovault.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;

/** One-time, short-lived states for the extension OAuth callback. */
@Service
@Slf4j
@lombok.RequiredArgsConstructor
public class OAuthStateService {
    private static final String PREFIX = "oauth:github:state:";
    private final RedisTemplate<String, Object> redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();
    private final ConcurrentHashMap<String, Long> inMemoryStates = new ConcurrentHashMap<>();

    public String issue() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        try {
            redisTemplate.opsForValue().set(PREFIX + state, Boolean.TRUE, Duration.ofMinutes(10));
        } catch (Exception e) {
            log.warn("Redis unavailable for OAuth state issue ({}). Falling back to in-memory store.", e.getMessage());
            inMemoryStates.put(state, System.currentTimeMillis() + 10 * 60 * 1000);
        }
        return state;
    }

    public boolean consume(String state) {
        if (state == null || !state.matches("^[A-Za-z0-9_-]{43}$")) return false;
        try {
            Object value = redisTemplate.opsForValue().getAndDelete(PREFIX + state);
            if (Boolean.TRUE.equals(value)) return true;
        } catch (Exception e) {
            log.warn("Redis unavailable for OAuth state consume ({}). Falling back to in-memory store.", e.getMessage());
        }
        Long expiresAt = inMemoryStates.remove(state);
        return expiresAt != null && expiresAt > System.currentTimeMillis();
    }
}
