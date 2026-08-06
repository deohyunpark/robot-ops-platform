package com.example.robotops.application.telemetry.service;

import com.example.robotops.application.telemetry.request.TelemetryPublishCommand;
import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TelemetryEventPublisher {

    private final KafkaProducer kafkaProducer;

    public void publish(TelemetryPublishCommand command) {
        publishDashboard(command);
        publishRedisState(command);
        publishRawTelemetry(command);
        publishDeviceEvent(command);
        publishDeviceState(command);
        publishMission(command);
        publishInsight(command);
    }

    private void publishDashboard(TelemetryPublishCommand command) {
        kafkaProducer.sendDashboard(command.payload());
    }

    private void publishRedisState(TelemetryPublishCommand command) {
        kafkaProducer.setRedis(command.payload());
    }

    private void publishRawTelemetry(TelemetryPublishCommand command) {
        kafkaProducer.sendTelemetry(
                TelemetryRawRequest.of(
                        command.topicInfo(),
                        command.payload(),
                        command.rawPayload()
                )
        );
    }

    private void publishDeviceEvent(TelemetryPublishCommand command) {
        kafkaProducer.detectDeviceEvent(command.payload());
    }

    private void publishDeviceState(TelemetryPublishCommand command) {
        kafkaProducer.sendDeviceState(
                DeviceStateRequest.of(
                        command.topicInfo(),
                        command.payload()
                )
        );
    }

    private void publishMission(TelemetryPublishCommand command) {
        kafkaProducer.detectMission(command.payload());
    }

    private void publishInsight(TelemetryPublishCommand command) {
        kafkaProducer.createInsightFeed(command.payload());
    }
}