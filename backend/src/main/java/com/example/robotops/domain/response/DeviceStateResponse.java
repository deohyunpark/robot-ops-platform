package com.example.robotops.domain.response;

import java.time.OffsetDateTime;

public record DeviceStateResponse(
        String deviceId,
        String siteId,
        Boolean online,
        String mode,
        String mission,
        Double batteryPct,
        Double speedMps,
        Double posX,
        Double posY,
        Double theta,
        String mapId,
        Double cpuPct,
        Double memPct,
        Double tempC,
        Boolean estop,
        Boolean bumper,
        Boolean obstacle,
        String errorCode,
        Long lastSeq,
        String lastSeenAt,
        OffsetDateTime updatedAt
) {
}
