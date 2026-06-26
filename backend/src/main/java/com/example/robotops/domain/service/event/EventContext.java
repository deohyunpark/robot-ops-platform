package com.example.robotops.domain.service.event;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;

public record EventContext(
        TelemetryPayload tp,
        RedisSnapshot snapshot
) {

    public Double battery() {
        return tp.state().batteryPct();
    }

    public Double temp() {
        return tp.health().tempC();
    }

    public Double speed() {
        return tp.state().speedMps();
    }

    public Boolean online() {
        return tp.state().online();
    }

    public Boolean bumper() {
        return tp.safety().bumper();
    }

    public Boolean estop() {
        return tp.safety().estop();
    }

    public Boolean obstacle() {
        return tp.safety().obstacle();
    }

    public String mission() {
        return tp.state().mission();
    }


}
