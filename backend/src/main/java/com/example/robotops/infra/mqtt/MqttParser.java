package com.example.robotops.infra.mqtt;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MqttParser {

    private final ObjectMapper om;

    public TelemetryPayload parse(String topic, MqttMessage message) {
        try {
            return om.readValue(
                    message.getPayload(),
                    TelemetryPayload.class
            );
        } catch (IOException exception) {
            throw new RobotOpsException(
                    ErrorCode.MQTT_PARSE_FAILED,
                    Map.of(
                            "topic", topic,
                            "messageId", message.getId()
                    ),
                    exception
            );
        }
    }
}
