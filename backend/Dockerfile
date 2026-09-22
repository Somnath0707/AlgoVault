FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache wget \
    && addgroup -S algovault && adduser -S algovault -G algovault
WORKDIR /app
COPY --from=build /app/target/algovault-backend-*.jar app.jar
RUN chown -R algovault:algovault /app
USER algovault
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
