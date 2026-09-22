package com.algovault.service;

import com.algovault.dto.ContestPredictionRequest;
import com.algovault.dto.ContestPredictionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
@Slf4j
public class EntrantHubService {

    private final RestTemplate restTemplate;
    private static final String ENTRANTHUB_BASE_URL = "https://api.entranthub.com/api/v1";

    private static final int MAX_CACHE_ENTRIES = 1000;
    private final Map<String, CacheEntry> predictionCache = Collections.synchronizedMap(
        new LinkedHashMap<String, CacheEntry>(MAX_CACHE_ENTRIES, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, CacheEntry> eldest) {
                return size() > MAX_CACHE_ENTRIES;
            }
        }
    );

    private static class CacheEntry {
        final ContestPredictionResponse response;
        final long cachedAt;

        CacheEntry(ContestPredictionResponse response, long cachedAt) {
            this.response = response;
            this.cachedAt = cachedAt;
        }

        boolean isExpired() {
            long now = System.currentTimeMillis();
            // EntrantHub predictions are static once calculated -> 12 hour TTL
            // Fallback predictions check back periodically -> 15 minute TTL
            long ttl = "ENTRANTHUB".equalsIgnoreCase(response.getSource())
                    ? 12 * 3600 * 1000L
                    : 15 * 60 * 1000L;
            return (now - cachedAt) > ttl;
        }
    }

    private void putCache(String key, CacheEntry entry) {
        synchronized (predictionCache) {
            if (predictionCache.size() >= MAX_CACHE_ENTRIES / 2) {
                predictionCache.entrySet().removeIf(e -> e.getValue().isExpired());
            }
            predictionCache.put(key, entry);
        }
    }

    private CacheEntry getCache(String key) {
        synchronized (predictionCache) {
            CacheEntry entry = predictionCache.get(key);
            if (entry != null && entry.isExpired()) {
                predictionCache.remove(key);
                return null;
            }
            return entry;
        }
    }

    public void clearCache() {
        predictionCache.clear();
    }

    /**
     * Replicates ForeCode's architecture to query live contest rating predictions from EntrantHub.
     * Endpoint: GET /api/v1/contests/leetcode/contests/{contestSlug}/rankings?limit=25&offset=0&userSlug={username}
     * Required headers: Origin and Referer pointing to https://entranthub.com to satisfy Cloudflare.
     */
    public ContestPredictionResponse predictContest(ContestPredictionRequest req) {
        String contestSlug = req.getContestSlug();
        String username = req.getUsername();

        if (contestSlug == null || contestSlug.isBlank() || username == null || username.isBlank()
                || !contestSlug.matches("^[a-zA-Z0-9_-]{1,60}$")
                || !username.matches("^[a-zA-Z0-9_-]{1,60}$")) {
            return fallbackPrediction(req, "Invalid contest slug or username format");
        }

        String normalizedSlug = contestSlug.trim().toLowerCase();
        String normalizedUsername = username.trim();
        String cacheKey = normalizedSlug + ":" + normalizedUsername.toLowerCase();

        CacheEntry cached = getCache(cacheKey);
        if (cached != null) {
            log.debug("Returning cached contest prediction for {}", cacheKey);
            return cached.response;
        }

        String url = UriComponentsBuilder.fromHttpUrl(ENTRANTHUB_BASE_URL)
                .path("/contests/leetcode/contests/{contestSlug}/rankings")
                .queryParam("limit", 25)
                .queryParam("offset", 0)
                .queryParam("userSlug", normalizedUsername)
                .buildAndExpand(normalizedSlug)
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "application/json, text/plain, */*");
            headers.set("Origin", "https://entranthub.com");
            headers.set("Referer", "https://entranthub.com/");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody().get("items");
                if (items != null && !items.isEmpty()) {
                    Map<String, Object> userItem = items.stream()
                            .filter(i -> normalizedUsername.equalsIgnoreCase((String) i.get("userSlug"))
                                    || normalizedUsername.equalsIgnoreCase((String) i.get("username")))
                            .findFirst()
                            .orElse(null);

                    if (userItem != null) {
                        Number newRating = (Number) userItem.get("newRating");
                        Number deltaRating = (Number) userItem.get("deltaRating");
                        Number oldRating = (Number) userItem.get("oldRating");
                        Number rank = (Number) userItem.get("rank");

                        if (newRating != null && deltaRating != null) {
                            log.info("EntrantHub prediction found for user={} contest={}: delta={}, newRating={}",
                                    normalizedUsername, normalizedSlug, deltaRating, newRating);

                            ContestPredictionResponse res = ContestPredictionResponse.builder()
                                    .contestSlug(normalizedSlug)
                                    .contestTitle(req.getContestTitle())
                                    .rank(rank != null ? rank.intValue() : req.getRank())
                                    .problemsSolved(req.getSolved())
                                    .totalProblems(req.getTotalQuestions() != null ? req.getTotalQuestions() : 4)
                                    .finishTimeMinutes(req.getFinishTimeMinutes())
                                    .ratingBefore(oldRating != null ? oldRating.doubleValue() : req.getCurrentRating())
                                    .predictedRating(Math.round(newRating.doubleValue() * 10.0) / 10.0)
                                    .predictedDelta(Math.round(deltaRating.doubleValue() * 10.0) / 10.0)
                                    .status("PREDICTED")
                                    .source("ENTRANTHUB")
                                    .build();

                            putCache(cacheKey, new CacheEntry(res, System.currentTimeMillis()));
                            return res;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("EntrantHub prediction lookup failed for user={} contest={}: {}", normalizedUsername, normalizedSlug, e.getMessage());
        }

        // When EntrantHub is still calculating or temporarily unavailable, use mathematical Elo fallback
        ContestPredictionResponse fallback = fallbackPrediction(req, "Pending EntrantHub calculation");
        if (!"UNRATED".equals(fallback.getStatus())) {
            putCache(cacheKey, new CacheEntry(fallback, System.currentTimeMillis()));
        }
        return fallback;
    }

    /**
     * Simple, deterministic Elo approximation fallback when live EntrantHub calculation is pending.
     */
    private ContestPredictionResponse fallbackPrediction(ContestPredictionRequest req, String reason) {
        double currentRating = req.getCurrentRating() != null && req.getCurrentRating() > 0
                ? req.getCurrentRating() : 1500.0;
        Integer rank = req.getRank();
        boolean hasParticipation = (req.getSolved() != null && req.getSolved() > 0)
                || (req.getFinishTimeMinutes() != null && req.getFinishTimeMinutes() > 0);

        // If user did not solve anything and has no finish time, they only registered and never participated
        if (!hasParticipation) {
            return ContestPredictionResponse.builder()
                    .contestSlug(req.getContestSlug())
                    .contestTitle(req.getContestTitle())
                    .rank(null)
                    .problemsSolved(0)
                    .totalProblems(req.getTotalQuestions() != null ? req.getTotalQuestions() : 4)
                    .finishTimeMinutes(null)
                    .ratingBefore(currentRating)
                    .predictedRating(currentRating)
                    .predictedDelta(0.0)
                    .status("UNRATED")
                    .source("FALLBACK")
                    .build();
        }

        Double predictedDelta = null;
        Double predictedRating = null;

        if (rank != null && rank > 0) {
            int totalParticipants = 25000;
            int attended = req.getAttendedContestsCount() != null ? req.getAttendedContestsCount() : 15;

            // Expected rank based on normal distribution of competitors (mean 1500, scale 350)
            double zExpected = (currentRating - 1500.0) / 350.0;
            double probBeat = 0.5 * (1.0 + Math.tanh(zExpected * 0.7978845608 * (1.0 + 0.044715 * zExpected * zExpected)));
            double erank = 1.0 + (totalParticipants - 1) * (1.0 - probBeat);

            // Geometric mean of expected rank and actual rank
            double geometricRank = Math.sqrt(erank * rank);
            double percentile = Math.max(0.0001, Math.min(0.9999, 1.0 - (geometricRank / totalParticipants)));

            // Inverse normal approximation to get implied performance rating
            double zPerf = approximateInverseNormal(percentile);
            double performanceRating = 1500.0 + zPerf * 350.0;

            // Attendance damping factor
            double damping = Math.max(0.12, 1.0 / (1.0 + 0.14 * Math.sqrt(attended)));
            predictedDelta = Math.round(((performanceRating - currentRating) * damping) * 10.0) / 10.0;
            predictedRating = Math.round((currentRating + predictedDelta) * 10.0) / 10.0;
        }

        return ContestPredictionResponse.builder()
                .contestSlug(req.getContestSlug())
                .contestTitle(req.getContestTitle())
                .rank(req.getRank())
                .problemsSolved(req.getSolved())
                .totalProblems(req.getTotalQuestions() != null ? req.getTotalQuestions() : 4)
                .finishTimeMinutes(req.getFinishTimeMinutes())
                .ratingBefore(currentRating)
                .predictedRating(predictedRating)
                .predictedDelta(predictedDelta)
                .status("PREDICTION_PENDING")
                .source("FALLBACK")
                .build();
    }

    private double approximateInverseNormal(double p) {
        // Acklam / Beasley-Springer rational approximation for inverse CDF
        double a1 = -39.69683028665376, a2 = 220.9460984245205, a3 = -275.9285104469687;
        double a4 = 138.3577518672690, a5 = -30.66479806614716, a6 = 2.506628277459239;
        double b1 = -54.47609879822406, b2 = 161.5858368580409, b3 = -155.6989798598866;
        double b4 = 66.80131188771972, b5 = -13.28068155288572;
        double c1 = -0.007784894002430293, c2 = -0.3223964580411365, c3 = -2.400758277161838;
        double c4 = -2.549732539343734, c5 = 4.374664141464968, c6 = 2.938163982698783;
        double d1 = 0.007784695709041462, d2 = 0.3224671290700398, d3 = 2.445134137142996, d4 = 3.754408661907416;

        double pLow = 0.02425;
        double pHigh = 1.0 - pLow;

        if (p < pLow) {
            double q = Math.sqrt(-2 * Math.log(p));
            return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else if (p <= pHigh) {
            double q = p - 0.5;
            double r = q * q;
            return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
        } else {
            double q = Math.sqrt(-2 * Math.log(1.0 - p));
            return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }
    }

    public String fetchHistory(String username, String region) {
        String url = UriComponentsBuilder.fromHttpUrl(ENTRANTHUB_BASE_URL)
                .path("/contests/leetcode/users/{region}/{username}/history")
                .buildAndExpand(region, username)
                .toUriString();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "application/json, text/plain, */*");
            headers.set("Origin", "https://entranthub.com");
            headers.set("Referer", "https://entranthub.com/");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody() != null ? response.getBody() : "[]";
        } catch (Exception e) {
            log.warn("EntrantHub user history lookup unreachable for user {}. AlgoVault uses official LeetCode data.", username);
            return "[]";
        }
    }

    public String fetchUpcoming() {
        List<Map<String, Object>> list = new ArrayList<>();

        // 1. Fetch Codeforces Contests
        try {
            String cfUrl = "https://codeforces.com/api/contest.list?gym=false";
            Map<String, Object> res = restTemplate.getForObject(cfUrl, Map.class);
            if (res != null && "OK".equals(res.get("status"))) {
                List<Map<String, Object>> result = (List<Map<String, Object>>) res.get("result");
                if (result != null) {
                    for (Map<String, Object> c : result) {
                        if ("BEFORE".equals(c.get("phase"))) {
                            Map<String, Object> item = new HashMap<>();
                            item.put("id", "cf-" + c.get("id"));
                            item.put("name", c.get("name"));
                            item.put("platform", "Codeforces");
                            long startTimeMs = ((Number) c.get("startTimeSeconds")).longValue() * 1000;
                            item.put("startTime", startTimeMs);
                            item.put("durationSeconds", c.get("durationSeconds"));
                            item.put("url", "https://codeforces.com/contest/" + c.get("id"));
                            list.add(item);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch Codeforces contests in fallback: {}", e.getMessage());
        }

        // 2. Fetch LeetCode Contests
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            String body = "{\"query\":\"query { upcomingContests { title titleSlug startTime duration } }\"}";
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://leetcode.com/graphql",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null) {
                    List<Map<String, Object>> upcomingContests = (List<Map<String, Object>>) data.get("upcomingContests");
                    if (upcomingContests != null) {
                        for (Map<String, Object> c : upcomingContests) {
                            Map<String, Object> item = new HashMap<>();
                            item.put("id", c.get("titleSlug"));
                            item.put("name", c.get("title"));
                            item.put("platform", "LeetCode");
                            long startTimeMs = ((Number) c.get("startTime")).longValue() * 1000;
                            item.put("startTime", startTimeMs);
                            item.put("durationSeconds", c.get("duration"));
                            item.put("url", "https://leetcode.com/contest/" + c.get("titleSlug"));
                            list.add(item);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch LeetCode contests in fallback: {}", e.getMessage());
        }

        list.sort(Comparator.comparingLong(a -> ((Number) a.get("startTime")).longValue()));

        try {
            return new ObjectMapper().writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
