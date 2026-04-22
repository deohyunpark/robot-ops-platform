package com.example.robotops.infra.kafka.producer;


import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.service.DeviceEventService;
import com.example.robotops.domain.service.eventrule.TelemetryHandler;
import com.example.robotops.infra.redis.JsonUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventConsumer {

    private final DeviceEventService eventService;
    private final JsonUtil jsonUtil;


    @KafkaListener(topics = "robot.device.state", groupId = "db-group")
    public void consume(String message) {

        // todo 쪼개기
        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
        List<DeviceEvent> deviceEvents = TelemetryHandler.evaluateAll(telemetryPayload);
        eventService.emitAll(deviceEvents);

    }
}
