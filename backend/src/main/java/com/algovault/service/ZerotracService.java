package com.algovault.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZerotracService {
    private static final String RATINGS_URL = "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt";
    private static final String CACHE_KEY = "zerotrac:ratings:v1";

    private final RedisTemplate<String, Object> redisTemplate;
    private final RestTemplate restTemplate = new RestTemplate();

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

        Map<String, Double> ratings = fetchRatings();
        try {
            redisTemplate.opsForValue().set(CACHE_KEY, ratings, Duration.ofHours(24));
        } catch (Exception e) {
            log.debug("Unable to cache ZeroTrac ratings in Redis", e);
        }
        return ratings;
    }

    private Map<String, Double> fetchRatings() {
        String body = restTemplate.getForObject(RATINGS_URL, String.class);
        Map<String, Double> ratings = new HashMap<>();
        if (body == null || body.isBlank()) {
            return ratings;
        }

        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("Rating ")) {
                continue;
            }

            String[] parts = trimmed.split("\\s+");
            if (parts.length < 6) {
                continue;
            }

            try {
                Double rating = Double.parseDouble(parts[0]);
                String titleSlug = parts[4];
                ratings.put(titleSlug, rating);
            } catch (NumberFormatException ignored) {
                // Skip malformed upstream rows without failing the whole sync.
            }
        }
        log.info("Fetched {} ZeroTrac ratings", ratings.size());
        return ratings;
    }
}
