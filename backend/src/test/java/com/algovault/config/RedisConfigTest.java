package com.algovault.config;

import com.algovault.dto.PredictionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RedisConfigTest {

    @Test
    void redisObjectMapper_serializesAndDeserializesPredictionResponseWithLongValues() {
        RedisConfig config = new RedisConfig();
        ObjectMapper mapper = config.redisObjectMapper();
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("blendedPriorPercent", 42L);
        breakdown.put("userRating", 1966.1);
        breakdown.put("tagCount", 5);
        breakdown.put("topic", "dynamic-programming");

        PredictionResponse response = PredictionResponse.builder()
                .solveChance(75)
                .expectedTimeMinutes(25)
                .confidence("HIGH")
                .breakdown(breakdown)
                .insufficientData(false)
                .build();

        byte[] bytes = serializer.serialize(response);
        assertThat(bytes).isNotNull();

        Object deserialized = serializer.deserialize(bytes);
        assertThat(deserialized).isInstanceOf(PredictionResponse.class);

        PredictionResponse result = (PredictionResponse) deserialized;
        assertThat(result.getSolveChance()).isEqualTo(75);
        assertThat(result.getBreakdown()).isNotNull();
        assertThat(result.getBreakdown().get("blendedPriorPercent")).isEqualTo(42L);
        assertThat(result.getBreakdown().get("userRating")).isEqualTo(1966.1);
    }
}
