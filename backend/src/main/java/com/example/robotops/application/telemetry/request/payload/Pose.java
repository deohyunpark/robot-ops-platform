package com.example.robotops.application.telemetry.request.payload;

public record Pose(
        Double x,
        Double y,
        Double theta,
        String mapId
) {
}
