package com.example.robotops.infra.kafka.producer;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.websocket.WebsocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryDashBoardConsumer {

    private final WebsocketService websocketService;
    private final JsonUtil jsonUtil;

    @KafkaListener(topics = "robot.device.dash-board", groupId = "all")
    public void consume(String message) {
        websocketService.broadcastDeviceState(jsonUtil.fromJson(message, TelemetryPayload.class));
    }
}
