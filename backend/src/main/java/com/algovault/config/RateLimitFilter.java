package com.algovault.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/** Redis-backed edge limit; intentionally uses the socket address, not spoofable forwarded headers. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/") || "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit;
        long windowSeconds;
        if (path.equals("/api/auth/github-exchange")) {
            limit = 30;
            windowSeconds = 3600;
        } else if (path.equals("/api/auth/github-token")) {
            limit = 120;
            windowSeconds = 3600;
        } else if (path.equals("/api/auth/github-state")) {
            limit = 60;
            windowSeconds = 3600;
        } else {
            limit = 180;
            windowSeconds = 60;
        }
        String key = "ratelimit:" + path + ":" + request.getRemoteAddr() + ":" + (System.currentTimeMillis() / (windowSeconds * 1000));
        Long count;
        try {
            count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) redisTemplate.expire(key, Duration.ofSeconds(windowSeconds + 5));
        } catch (Exception unavailable) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Rate-limit service unavailable");
            return;
        }
        if (count == null || count > limit) {
            response.setHeader("Retry-After", String.valueOf(windowSeconds));
            response.sendError(429, "Too many requests");
            return;
        }
        chain.doFilter(request, response);
    }
}
