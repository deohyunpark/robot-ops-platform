package com.example.robotops.application.telemetry.request.payload;

public record State(
        Boolean online,
        String mode,
        String mission,
        Double batteryPct,
        Double speedMps
) {
}
