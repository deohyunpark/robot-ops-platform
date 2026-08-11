package com.example.robotops.domain.response;

import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record PriorityDeviceResponse(
        String deviceId,
        boolean hasOpenCritical,
        DeviceEventResponse deviceEventResponse,
        int riskScore,
        String riskLevel,
        OffsetDateTime latestEventAt
) {
    public static PriorityDeviceResponse of(String deviceId, boolean hasOpenCritical, DeviceEventResponse deviceEventResponse, int riskScore, String riskLevel, OffsetDateTime latestEventAt) {
        return PriorityDeviceResponse.builder()
                .deviceId(deviceId)
                .hasOpenCritical(hasOpenCritical)
                .deviceEventResponse(deviceEventResponse)
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .latestEventAt(latestEventAt)
                .build();
    }
}
