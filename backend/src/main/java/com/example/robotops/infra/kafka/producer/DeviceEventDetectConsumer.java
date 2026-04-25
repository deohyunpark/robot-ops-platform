package com.example.robotops.infra.kafka.producer;


import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.websocket.WebsocketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventDetectConsumer {

    private final JsonUtil jsonUtil;
    private final DeviceEventRepository deviceEventRepository;
    private final WebsocketService websocketService;

    @KafkaListener(topics = "robot.device.event.detected", groupId = "db")
    public void consumeDb(String message) {

        deviceEventRepository.save(jsonUtil.fromJson(message, DeviceEvent.class));
    }

    @KafkaListener(topics = "robot.device.event.detected", groupId = "ws")
    public void consumeWs(String message) {
        websocketService.pushEvent(jsonUtil.fromJson(message, DeviceEvent.class));
    }
}
