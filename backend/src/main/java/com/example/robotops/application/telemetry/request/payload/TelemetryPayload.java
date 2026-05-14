package com.example.robotops.application.telemetry.request.payload;

import java.util.List;

public record TelemetryPayload(
        String ts,
        String robotId,
        Integer seq,
        State state,
        Pose pose,
        Health health,
        Safety safety,
        List<Errors> errors

) {
    public boolean isActive(String mission) {
        return !"IDLE".equals(mission) && !"CHARGE".equals(mission);
    }
}
