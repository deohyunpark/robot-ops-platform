package com.example.robotops.infra.mqtt;

import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MqttPublisher {

    private final MqttClient mqttClient;

    public void publish(String topic, String payload) {

        if (!mqttClient.isConnected()) {
            throw new RobotOpsException(
                    ErrorCode.MQTT_NOT_CONNECTED
            );
        }

        try {
            MqttMessage message =
                    new MqttMessage(
                            payload.getBytes(StandardCharsets.UTF_8)
                    );

            message.setQos(1);
            message.setRetained(false);

            mqttClient.publish(topic, message);

            log.info(
                    "MQTT published. topic={}, payload={}",
                    topic,
                    payload
            );

        } catch (MqttException e) {
            throw new RobotOpsException(
                    ErrorCode.MQTT_PUBLISH_FAILED
            );
        }
    }
}