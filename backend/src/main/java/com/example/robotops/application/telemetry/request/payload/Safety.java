package com.example.robotops.application.telemetry.request.payload;

public record Safety(
        Boolean estop,
        Boolean bumper,
        Boolean obstacle
) {
}
