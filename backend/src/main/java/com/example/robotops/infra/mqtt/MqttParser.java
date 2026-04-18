package com.example.robotops.infra.mqtt;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MqttParser {

    private final ObjectMapper om;

    public Optional<TelemetryPayload> parse(String topic, MqttMessage message) {
        try {
            return Optional.of(
                    om.readValue(message.getPayload(), TelemetryPayload.class)
            );
        } catch (IOException e) {
            log.warn("[MQTT PARSE ERROR] topic={}, payload={}",
                    topic,
                    new String(message.getPayload())
            );
            return Optional.empty();
        }
    }
}
