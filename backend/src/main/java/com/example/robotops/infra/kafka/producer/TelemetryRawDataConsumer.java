package com.example.robotops.infra.kafka.producer;


import com.example.robotops.application.telemetry.repository.TelemetryRepository;
import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryRawDataConsumer {

    private final TelemetryRepository telemetryRepository;
    private final JsonUtil jsonUtil;

    @KafkaListener(topics = "robot.telemetry.raw", groupId = "db-group")
    public void consume(String message) {
        TelemetryRawRequest telemetryRawRequest = jsonUtil.fromJson(message, TelemetryRawRequest.class);
        telemetryRepository.save(telemetryRawRequest);
        log.info("[DB] MQTT raw data inserted = {}", telemetryRawRequest.deviceId());
    }
}
