package com.example.robotops.domain.request;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record DeviceStateRequest(
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
    public static DeviceStateRequest of(TopicInfo ti, TelemetryPayload p) {
        return DeviceStateRequest.builder()
                .siteId(ti.siteId())
                .deviceId(p.robotId())
                .online(p.state().online())
                .mode(p.state().mode())
                .mission(p.state().mission())
                .batteryPct(p.state().batteryPct())
                .speedMps(p.state().speedMps())
                .posX(p.pose().x())
                .posY(p.pose().y())
                .theta(p.pose().theta())
                .mapId(p.pose().mapId())
                .cpuPct(p.health().cpuPct())
                .memPct(p.health().memPct())
                .tempC(p.health().tempC())
                .estop(p.safety().estop())
                .bumper(p.safety().bumper())
                .obstacle(p.safety().obstacle())
                .errorCode(p.errors().toString())
                .lastSeq(p.seq().longValue())
                .lastSeenAt(p.ts())
                .updatedAt(OffsetDateTime.now())
                .build();
    }
}
