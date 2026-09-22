package com.algovault.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Universal production-ready DataSource configuration.
 * Automatically parses and adapts standard cloud database connection URLs
 * (e.g., DATABASE_URL=postgres://user:pass@host:port/db from Render, Railway, Fly.io, Heroku, Neon, Supabase)
 * into JDBC format with credential extraction and connection pool optimization.
 */
@Configuration
@Slf4j
public class DataSourceConfig {

    @Value("${spring.datasource.url:}")
    private String springDatasourceUrl;

    @Value("${spring.datasource.username:}")
    private String springDatasourceUsername;

    @Value("${spring.datasource.password:}")
    private String springDatasourcePassword;

    @Value("${db.pool.max-size:10}")
    private int maxPoolSize;

    @Value("${db.pool.min-idle:2}")
    private int minIdle;

    @Bean
    @Primary
    public DataSource dataSource() {
        // 1. Check DATABASE_URL environment variable first (Render, Railway, Fly, Heroku, Neon, Supabase standard)
        String rawUrl = System.getenv("DATABASE_URL");
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("SPRING_DATASOURCE_URL");
        }
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = springDatasourceUrl;
        }

        HikariConfig hikariConfig = new HikariConfig();
        hikariConfig.setPoolName("AlgoVault-HikariPool");
        hikariConfig.setMaximumPoolSize(Math.max(2, maxPoolSize));
        hikariConfig.setMinimumIdle(Math.max(1, minIdle));
        hikariConfig.setConnectionTimeout(15000);
        hikariConfig.setIdleTimeout(30000);
        hikariConfig.setMaxLifetime(1800000);
        hikariConfig.setLeakDetectionThreshold(60000);

        if (rawUrl != null && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://"))) {
            log.info("Detected cloud PostgreSQL URI format; adapting to JDBC HikariCP DataSource...");
            try {
                // Ensure proper URI parsing scheme
                String parseUrl = rawUrl;
                if (parseUrl.startsWith("postgres://")) {
                    parseUrl = "postgresql://" + parseUrl.substring("postgres://".length());
                }

                URI uri = new URI(parseUrl);
                String userInfo = uri.getUserInfo();
                String username = springDatasourceUsername;
                String password = springDatasourcePassword;

                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                } else if (userInfo != null) {
                    username = userInfo;
                }

                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }

                StringBuilder jdbcUrlBuilder = new StringBuilder("jdbc:postgresql://")
                        .append(host)
                        .append(":")
                        .append(port)
                        .append("/")
                        .append(path);

                String query = uri.getQuery();
                if (query != null && !query.isBlank()) {
                    jdbcUrlBuilder.append("?").append(query);
                } else if (!"localhost".equalsIgnoreCase(host) && !"127.0.0.1".equals(host)) {
                    // Cloud databases usually require SSL
                    jdbcUrlBuilder.append("?sslmode=require");
                }

                String jdbcUrl = jdbcUrlBuilder.toString();
                hikariConfig.setJdbcUrl(jdbcUrl);
                hikariConfig.setUsername(username);
                hikariConfig.setPassword(password);
                log.info("Successfully configured HikariCP for host: {}, port: {}, database: {}", host, port, path);
            } catch (Exception e) {
                log.error("Failed to parse PostgreSQL URI: {}. Falling back to standard properties.", e.getMessage());
                hikariConfig.setJdbcUrl(rawUrl);
                hikariConfig.setUsername(springDatasourceUsername);
                hikariConfig.setPassword(springDatasourcePassword);
            }
        } else {
            // Standard JDBC URL (e.g., jdbc:postgresql://localhost:5432/algovault)
            String jdbcUrl = (rawUrl != null && !rawUrl.isBlank()) ? rawUrl : "jdbc:postgresql://localhost:5432/algovault";
            hikariConfig.setJdbcUrl(jdbcUrl);
            hikariConfig.setUsername(springDatasourceUsername != null && !springDatasourceUsername.isBlank() ? springDatasourceUsername : "algovault");
            hikariConfig.setPassword(springDatasourcePassword);
        }

        hikariConfig.setDriverClassName("org.postgresql.Driver");
        return new HikariDataSource(hikariConfig);
    }
}
