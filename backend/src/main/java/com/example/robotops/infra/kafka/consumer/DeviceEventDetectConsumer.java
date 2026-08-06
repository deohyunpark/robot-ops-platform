package com.example.robotops.infra.kafka.consumer;


import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.service.DeviceEventService;
import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventDetectConsumer {

    private final JsonUtil jsonUtil;
    private final DeviceEventService deviceEventService;

    @KafkaListener(topics = "robot.device.event.detected", groupId = "detected-event-processor")
    public void consume(String message) {
        deviceEventService.process(jsonUtil.fromJson(message, DeviceEvent.class));
    }

}
