package com.example.robotops.infra.kafka.consumer;


import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.service.event.EventContext;
import com.example.robotops.domain.service.event.EventEngine;
import com.example.robotops.domain.service.event.RedisSnapshotBuilder;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisSyncService;
import java.util.List;
import java.util.Objects;
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
        // 1. mqtt -> payload 변환
        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);

        // 2. 이벤트 생성시 필요한 context 생성
        EventContext eventContext = new EventContext(telemetryPayload, redisSnapshotBuilder.build(telemetryPayload));

        // 3. rule check 후 event 생성
        List<DeviceEvent> deviceEventList =
                eventEngine.process(eventContext)
                        .stream().filter(Objects::nonNull)
                        .toList();



        // 4. event 생성 후 레디스 갱신 + act kafka
        for (DeviceEvent event : deviceEventList) {
            redisSyncService.countSync(eventContext, event);
            kafkaProducer.sendDeviceEvent(event);
        }
    }
}
