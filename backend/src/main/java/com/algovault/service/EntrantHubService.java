package com.algovault.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class EntrantHubService {
    private final RestTemplate restTemplate = new RestTemplate();
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
        String url = ENTRANTHUB_BASE_URL + "/contests?status=upcoming";
        try {
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            log.error("Failed to fetch EntrantHub upcoming contests from {}: {}", url, e.getMessage());
            return "[]";
        }
    }
}
