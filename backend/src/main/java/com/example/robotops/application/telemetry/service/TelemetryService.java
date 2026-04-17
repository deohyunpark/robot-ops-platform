package com.example.robotops.application.telemetry.service;

import com.example.robotops.application.telemetry.repository.TelemetryRepository;
import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;
import com.example.robotops.domain.repository.DeviceStateUpsertRepository;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Service;



@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryService {

    private final ObjectMapper om = new ObjectMapper();
    private final TelemetryRepository telemetryRepository;
    private final DeviceStateUpsertRepository deviceStateUpsertRepository;

    @Transactional
    public void process(String topic, MqttMessage message) {
        /**
         * 1. mqtt 파싱
         * 2. mqtt 데이터 저장
         * 3. device 상태저장
         * 4. 이벤트 감지
         */

        // mqtt 에서 payload 추출
        TelemetryPayload tp = null;
        try {
            tp = om.readValue(message.getPayload(), TelemetryPayload.class);
        } catch (IOException e) {
            log.error("mqtt parse failed", e);
            return;
        }

        TelemetryRawRequest telemetryRawRequest = TelemetryRawRequest.of(TopicInfo.of(topic), tp, message.getPayload());

        telemetryRepository.save(telemetryRawRequest);
        System.out.println(telemetryRawRequest);
        log.info("[DB] inserted = {}", telemetryRawRequest.deviceId());

        DeviceStateRequest deviceStateRequest = DeviceStateRequest.of(TopicInfo.of(topic), tp);
        deviceStateUpsertRepository.upsert(deviceStateRequest);
        System.out.println(deviceStateRequest);
        log.info("[DB] upserted = {}", deviceStateRequest.batteryPct());
    }


    private void deviceStateSave() {
        // id 당 하나만 저장
        //최신 업데이트

    }

    private void detectEvents() {

    }


}
