package com.example.robotops.application.telemetry.service;

import com.example.robotops.application.telemetry.request.TelemetryPublishCommand;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.infra.mqtt.MqttParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Service;



@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryService {

    private final MqttParser mqttParser;
    private final TelemetryEventPublisher telemetryEventPublisher;

    public void process(String topic, MqttMessage message) {
        TelemetryPayload payload = mqttParser.parse(topic, message);

        telemetryEventPublisher.publish(
                TelemetryPublishCommand.of(
                        topic,
                        payload,
                        message.getPayload()
                )
        );
    }
}
