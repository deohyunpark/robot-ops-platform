package com.example.robotops.application.telemetry.request;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;
import lombok.Builder;

@Builder
public record TelemetryRawRequest(
        String ts,
        String siteId,
        String deviceId,
        String msgId,
        Double battery,
        Double temp,
        String rawJson
) {
    public static TelemetryRawRequest of(
            TopicInfo ti, TelemetryPayload pl, byte[] rawJson) {
        return TelemetryRawRequest.builder()
                .ts(pl.ts())
                .siteId(ti.siteId())
                .deviceId(ti.deviceId())
                .msgId(String.valueOf(pl.seq()))
                .battery(pl.state().batteryPct())
                .temp(pl.health().tempC())
                .rawJson(new String(rawJson))
                .build();
    }
}
