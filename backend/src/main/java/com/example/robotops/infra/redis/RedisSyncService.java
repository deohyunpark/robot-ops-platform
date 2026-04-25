package com.example.robotops.infra.redis;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.eventpayload.PayloadField;
import com.example.robotops.domain.service.eventrule.EventContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisSyncService {

    private final RedisService redisService;

    public void eventSync(TelemetryPayload telemetryPayload) {
        redisService.updateHeartbeat(telemetryPayload.robotId());
        redisService.updateMetric(telemetryPayload.robotId(), PayloadField.SPEED.key(), telemetryPayload.state().speedMps());
        redisService.updateWindow(telemetryPayload.robotId(), PayloadField.CPU.key(), telemetryPayload.health().cpuPct());
        redisService.updateWindow(telemetryPayload.robotId(), PayloadField.TEMP.key(), telemetryPayload.health().tempC());
    }

    public void countSync(EventContext eventContext, DeviceEvent deviceEvent) {

        if (deviceEvent.getEventType().equals(EventType.SPEED_RISING)) {
            redisService.updateCount(eventContext.tp().robotId(), PayloadField.SPEED.key(), 0);
        }
        redisService.updateCount(eventContext.tp().robotId(), PayloadField.SPEED.key(), eventContext.snapshot().countSpeed());
    }
}
