package com.example.robotops.application.telemetry.service;

import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
import com.example.robotops.infra.mqtt.MqttParser;
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
    private final KafkaProducer kafkaProducer;

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

                    kafkaProducer.sendDashBoard(telemetryPayload);
                    kafkaProducer.setRedis(telemetryPayload);
                    kafkaProducer.sendTelemetry(
                            TelemetryRawRequest.of(TopicInfo.of(topic), telemetryPayload, message.getPayload()));
                    kafkaProducer.detectDeviceEvent(telemetryPayload);
                    kafkaProducer.sendDeviceState(DeviceStateRequest.of(TopicInfo.of(topic), telemetryPayload));
                    kafkaProducer.detectMission(telemetryPayload);
                    kafkaProducer.createInsightFeed(telemetryPayload);
                }
        );

    }
}
