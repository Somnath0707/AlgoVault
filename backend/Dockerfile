# Multi-stage build for universal cloud deployment
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache Maven dependencies layer
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Build application artifact
COPY src ./src
RUN mvn clean package -DskipTests

# Minimal hardened JRE runtime
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache wget curl ca-certificates \
    && addgroup -S algovault && adduser -S algovault -G algovault

WORKDIR /app
COPY --from=build /app/target/algovault-backend-*.jar app.jar
RUN chown -R algovault:algovault /app

USER algovault

ENV PORT=8080
EXPOSE 8080

# Dynamic port-aware health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/health" >/dev/null || exit 1

# Container-aware JVM with automatic memory ergonomics and graceful SIGTERM signal propagation
ENTRYPOINT ["sh", "-c", "exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError ${JAVA_OPTS:-} -Dserver.port=${PORT:-8080} -jar app.jar"]
