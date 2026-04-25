package com.example.robotops.infra.kafka.producer;


import com.example.robotops.application.telemetry.repository.TelemetryRepository;
import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryRawDataConsumer {

    private final TelemetryRepository telemetryRepository;
    private final JsonUtil jsonUtil;
    private final RedisSyncService redisSyncService;

    @KafkaListener(topics = "robot.telemetry.raw", groupId = "db")
    public void saveRawData(String message) {
        TelemetryRawRequest telemetryRawRequest = jsonUtil.fromJson(message, TelemetryRawRequest.class);
        telemetryRepository.save(telemetryRawRequest);
        log.info("[DB] MQTT raw data inserted = {}", telemetryRawRequest.deviceId());
    }

    @KafkaListener(topics = "robot.telemetry.payload", groupId = "redis")
    public void setRedis(String message) {
        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
        redisSyncService.eventSync(telemetryPayload);
        log.info("[Redis] MQTT raw data inserted = {}", telemetryPayload.robotId());
    }
}
