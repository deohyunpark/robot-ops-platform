package com.example.robotops.domain.response;

import java.util.Map;
import lombok.Builder;

@Builder
public record UtilizationResponse(
        String deviceId,
        long bucketTime,
        long totalSeconds,
        long activeSeconds
) {
    public static UtilizationResponse from(String deviceId, long bucketTime, Map<String, String> utilization) {
        return UtilizationResponse.builder()
                .deviceId(deviceId)
                .bucketTime(bucketTime)
                .totalSeconds(parseLongOrZero(utilization.get("totalSeconds")))
                .activeSeconds(parseLongOrZero(utilization.get("activeSeconds")))
                .build();
    }

    private static long parseLongOrZero(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw)) {
            return 0L;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
