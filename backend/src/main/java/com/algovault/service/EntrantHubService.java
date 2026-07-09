package com.algovault.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Comparator;

@Service
@org.springframework.transaction.annotation.Transactional
@RequiredArgsConstructor
@Slf4j
public class EntrantHubService {
    private final RestTemplate restTemplate;
    private static final String ENTRANTHUB_BASE_URL = "https://api.entranthub.com/api/v1";

    public String fetchHistory(String username, String region) {
        String url = UriComponentsBuilder.fromHttpUrl(ENTRANTHUB_BASE_URL)
                .path("/contests/leetcode/users/{region}/{username}/history")
                .buildAndExpand(region, username)
                .toUriString();
        
        try {
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("Failed to fetch EntrantHub history for {} from {}: {}", username, url, e.getMessage());
            return "[]";
        }
    }

    public String fetchRanking(String contestSlug, String username) {
        String url = UriComponentsBuilder.fromHttpUrl(ENTRANTHUB_BASE_URL)
                .path("/contests/leetcode/contests/{contestSlug}/rankings")
                .queryParam("limit", 25)
                .queryParam("offset", 0)
                .queryParam("userSlug", username)
                .buildAndExpand(contestSlug)
                .toUriString();

        try {
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("Failed to fetch EntrantHub ranking for {} in {}: {}", username, contestSlug, e.getMessage());
            return null;
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
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            String body = "{\"query\":\"query { upcomingContests { title titleSlug startTime duration } }\"}";
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(body, headers);
            
            org.springframework.http.ResponseEntity<Map> response = restTemplate.exchange(
                "https://leetcode.com/graphql",
                org.springframework.http.HttpMethod.POST,
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

        // 3. Fallback to sample data if both fail (offline safety)
        if (list.isEmpty()) {
            long now = System.currentTimeMillis();
            Map<String, Object> c1 = new HashMap<>();
            c1.put("id", "weekly-408");
            c1.put("name", "Weekly Contest 408");
            c1.put("platform", "LeetCode");
            c1.put("startTime", now + 3600000 * 24);
            c1.put("durationSeconds", 5400);
            c1.put("url", "https://leetcode.com/contest/weekly-contest-408");
            list.add(c1);

            Map<String, Object> c2 = new HashMap<>();
            c2.put("id", "cf-952");
            c2.put("name", "Codeforces Round 952 (Div. 4)");
            c2.put("platform", "Codeforces");
            c2.put("startTime", now + 3600000 * 48);
            c2.put("durationSeconds", 7200);
            c2.put("url", "https://codeforces.com/contests");
            list.add(c2);
        }

        list.sort(Comparator.comparingLong(a -> ((Number) a.get("startTime")).longValue()));

        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }
}
