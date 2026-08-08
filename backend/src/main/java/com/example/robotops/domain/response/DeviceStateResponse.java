package com.example.robotops.domain.response;

import com.example.robotops.domain.entity.DeviceState;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
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
    public static DeviceStateResponse of(DeviceState deviceState) {
        return DeviceStateResponse.builder()
                .deviceId(deviceState.getId().deviceId())
                .build();
    }
}
