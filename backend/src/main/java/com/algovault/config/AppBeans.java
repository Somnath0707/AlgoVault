package com.algovault.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppBeans {
    @Bean
    RestTemplate restTemplate(org.springframework.boot.web.client.RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(java.time.Duration.ofSeconds(10))
            .setReadTimeout(java.time.Duration.ofSeconds(30))
            .build();
    }
}
