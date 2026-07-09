package com.algovault.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.Serializable;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
@Slf4j
public class ZerotracService {
    private static final String RATINGS_URL = "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt";
    private static final String FALLBACK_URL = "https://cdn.jsdelivr.net/gh/zerotrac/leetcode_problem_rating@main/ratings.txt";
    private static final String CACHE_KEY = "zerotrac:ratings:v3";
    private static final String FULL_CACHE_KEY = "zerotrac:full-ratings:v3";

    private final RedisTemplate<String, Object> redisTemplate;
    private final RestTemplate restTemplate;

    public record ZerotracInfo(Double rating, String title, String contestId, String problemIndex) implements Serializable {
        private static final long serialVersionUID = 1L;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Double> getRatingsBySlug() {
        try {
            Object cached = redisTemplate.opsForValue().get(CACHE_KEY);
            if (cached instanceof Map<?, ?>) {
                return (Map<String, Double>) cached;
            }
        } catch (Exception e) {
            log.debug("Redis unavailable for ZeroTrac cache, fetching fresh ratings", e);
        }

        Map<String, Double> ratings = new HashMap<>();
        try {
            Map<String, ZerotracInfo> fullRatings = fetchFullRatings();
            for (Map.Entry<String, ZerotracInfo> entry : fullRatings.entrySet()) {
                ratings.put(entry.getKey(), entry.getValue().rating());
            }
            if (!ratings.isEmpty()) {
                try {
                    redisTemplate.opsForValue().set(CACHE_KEY, ratings, Duration.ofHours(24));
                } catch (Exception e) {
                    log.debug("Unable to cache ZeroTrac ratings in Redis", e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch ZeroTrac ratings", e);
        }
        return ratings;
    }

    @SuppressWarnings("unchecked")
    public Map<String, ZerotracInfo> getFullRatings() {
        try {
            Object cached = redisTemplate.opsForValue().get(FULL_CACHE_KEY);
            if (cached instanceof Map<?, ?>) {
                return (Map<String, ZerotracInfo>) cached;
            }
        } catch (Exception e) {
            log.debug("Redis unavailable for ZeroTrac full cache, fetching fresh full ratings", e);
        }

        Map<String, ZerotracInfo> ratings = new HashMap<>();
        try {
            ratings = fetchFullRatings();
            if (!ratings.isEmpty()) {
                try {
                    redisTemplate.opsForValue().set(FULL_CACHE_KEY, ratings, Duration.ofHours(24));
                } catch (Exception e) {
                    log.debug("Unable to cache ZeroTrac full ratings in Redis", e);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch ZeroTrac full ratings", e);
        }
        return ratings;
    }

    private Map<String, ZerotracInfo> fetchFullRatings() {
        String body = null;
        try {
            body = restTemplate.getForObject(RATINGS_URL, String.class);
        } catch (Exception e) {
            log.warn("Failed to fetch ZeroTrac ratings from primary URL, trying jsDelivr fallback", e);
            try {
                body = restTemplate.getForObject(FALLBACK_URL, String.class);
            } catch (Exception ex) {
                log.error("Failed to fetch ZeroTrac ratings from both primary and jsDelivr CDN fallbacks", ex);
            }
        }

        Map<String, ZerotracInfo> ratings = new HashMap<>();
        if (body == null || body.isBlank()) {
            return ratings;
        }

        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("Rating ")) {
                continue;
            }

            String[] parts = trimmed.split("\\t");
            if (parts.length < 5) {
                continue;
            }

            try {
                Double rating = Double.parseDouble(parts[0]);
                String titleSlug = parts[4];
                String title = parts.length > 2 ? parts[2] : titleSlug;
                String contestId = parts.length > 5 ? parts[5] : "";
                String problemIndex = parts.length > 6 ? parts[6] : "?";
                ratings.put(titleSlug, new ZerotracInfo(rating, title, contestId, problemIndex));
            } catch (NumberFormatException ignored) {
                // Skip malformed upstream rows without failing the whole sync.
            }
        }
        log.info("Fetched {} ZeroTrac ratings records", ratings.size());
        return ratings;
    }
}
