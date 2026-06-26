package com.example.robotops.domain.response;

import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record RedisEventResponse(
        String deviceId,
        String eventName,
        OffsetDateTime createdAt
) {
    public static RedisEventResponse of(String deviceId, String eventName, OffsetDateTime createdAt) {
        return RedisEventResponse.builder()
                .deviceId(deviceId)
                .eventName(eventName)
                .createdAt(createdAt)
                .build();
    }
}
