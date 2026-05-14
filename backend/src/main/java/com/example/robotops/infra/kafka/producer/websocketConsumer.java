package com.example.robotops.infra.kafka.producer;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.service.DashBoardService;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.websocket.WebsocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class websocketConsumer {

    private final WebsocketService websocketService;
    private final DashBoardService dashBoardService;
    private final JsonUtil jsonUtil;

    @KafkaListener(topics = "robot.device.dash-board", groupId = "all")
    public void dashBoard(String message) {
        websocketService.broadcastDeviceState(jsonUtil.fromJson(message, TelemetryPayload.class));
    }

    @KafkaListener(topics = "robot.device.throughput", groupId = "all")
    public void throughput(String deviceId) {
        websocketService.broadcastThroughput(dashBoardService.getThroughput());
    }
}
