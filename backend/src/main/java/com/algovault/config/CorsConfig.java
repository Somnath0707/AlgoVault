package com.algovault.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                List<String> origins = new ArrayList<>();
                if (allowedOrigins != null && !allowedOrigins.isBlank()) {
                    for (String origin : allowedOrigins.split(",")) {
                        String trimmed = origin.trim();
                        if (!trimmed.isBlank()) {
                            origins.add(trimmed);
                        }
                    }
                }
                
                // Always allow Chrome Extension origins for the companion extension
                origins.add("chrome-extension://*");

                registry.addMapping("/api/**")
                        .allowedOriginPatterns(origins.toArray(new String[0]))
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
