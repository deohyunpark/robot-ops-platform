package com.example.robotops.application.telemetry.request.payload;

public record Health(
        Double cpuPct,
        Double memPct,
        Double tempC
) {
}
