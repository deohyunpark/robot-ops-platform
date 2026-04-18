package com.example.robotops.application.telemetry.service;

import com.example.robotops.application.telemetry.repository.TelemetryRepository;
import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;
import com.example.robotops.domain.repository.DeviceStateUpsertRepository;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.infra.mqtt.MqttParser;
import com.example.robotops.infra.redis.RedisService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Service;



@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryService {

    private final MqttParser mqttParser;
    private final TelemetryRepository telemetryRepository;
    private final DeviceStateUpsertRepository deviceStateUpsertRepository;
    private final RedisService redisService;

    @Transactional
    public void process(String topic, MqttMessage message) {
        /**
         * 1. mqtt 파싱
         * 2. mqtt 데이터 저장
         * 3. device 상태저장
         * 4. 이벤트 감지
         */

        mqttParser.parse(topic, message).ifPresent(
                telemetryPayload -> {
                    TelemetryRawRequest telemetryRawRequest = TelemetryRawRequest.of(TopicInfo.of(topic), telemetryPayload, message.getPayload());
                    telemetryRepository.save(telemetryRawRequest);
                    log.info("[DB] inserted = {}", telemetryRawRequest.deviceId());

                    DeviceStateRequest deviceStateRequest = DeviceStateRequest.of(TopicInfo.of(topic), telemetryPayload);
                    deviceStateUpsertRepository.upsert(deviceStateRequest);
                    log.info("[DB] upserted = {}", deviceStateRequest.deviceId());
                    redisService.saveState(deviceStateRequest);
                    log.info("[Redis] device state/lastSeen saved = {}", deviceStateRequest.deviceId());
                }
        );

    }
}
