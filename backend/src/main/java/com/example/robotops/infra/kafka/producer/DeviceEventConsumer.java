package com.example.robotops.infra.kafka.producer;


import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.service.eventrule.EventContext;
import com.example.robotops.domain.service.eventrule.EventEngine;
import com.example.robotops.domain.service.eventrule.RedisSnapshotBuilder;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisSyncService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventConsumer {

    private final KafkaProducer kafkaProducer;
    private final RedisSnapshotBuilder redisSnapshotBuilder;
    private final EventEngine eventEngine;
    private final JsonUtil jsonUtil;
    private final RedisSyncService redisSyncService;

    @KafkaListener(topics = "robot.device.event", groupId = "detect")
    public void consume(String message) {

        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
        EventContext eventContext = new EventContext(telemetryPayload, redisSnapshotBuilder.build(telemetryPayload));
        List<DeviceEvent> deviceEventList =
                eventEngine.process(eventContext);

        deviceEventList.forEach( deviceEvent -> redisSyncService.countSync(eventContext, deviceEvent));
        deviceEventList.forEach(kafkaProducer::sendDeviceEvent);
    }
}
