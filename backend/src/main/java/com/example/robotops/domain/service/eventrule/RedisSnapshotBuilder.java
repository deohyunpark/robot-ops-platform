package com.example.robotops.domain.service.eventrule;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.response.eventpayload.PayloadField;
import com.example.robotops.infra.redis.RedisService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisSnapshotBuilder {

    private final RedisService redisService;

    public RedisSnapshot build(TelemetryPayload tp) {

        Double lastSpeed = redisService.getMetric(tp.robotId(), PayloadField.SPEED.key());
        Double lastBattery = redisService.getMetric(tp.robotId(), PayloadField.BATTERY.key());
        Integer countSpeed = redisService.getCount(tp.robotId(), PayloadField.SPEED.key());
        Integer countBattery = redisService.getCount(tp.robotId(), PayloadField.BATTERY.key());
        List<String> cpuWindow = redisService.getWindow(tp.robotId(), PayloadField.CPU.key());
        List<String> tempWindow = redisService.getWindow(tp.robotId(), PayloadField.TEMP.key());

        return RedisSnapshot.builder()
                .lastSpeed(lastSpeed)
                .lastBattery(lastBattery)
                .countSpeed(countSpeed)
                .countBattery(countBattery)
                .cpuWindow(cpuWindow)
                .tempWindow(tempWindow)
                .build();
    }
}
