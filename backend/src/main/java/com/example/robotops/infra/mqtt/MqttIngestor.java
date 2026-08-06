package com.example.robotops.infra.mqtt;

import com.example.robotops.application.telemetry.service.TelemetryService;
import com.example.robotops.error.RobotOpsException;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MqttIngestor implements MqttCallback {

    private final TelemetryService telemetryService;
    private final MeterRegistry meterRegistry;

    @Value("${app.mqtt.brokerUrl}")
    private String brokerUrl;

    private MqttClient mqttClient;

    @EventListener(ApplicationReadyEvent.class)
    public void start() throws Exception {
        String clientId = "ingestor-" + System.currentTimeMillis();

        mqttClient = new MqttClient(
                brokerUrl,
                clientId,
                new MemoryPersistence()
        );

        mqttClient.setCallback(this);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        mqttClient.connect(options);
        mqttClient.subscribe("factory/+/robot/+/telemetry", 1);

        log.info("MQTT connected. brokerUrl={}", brokerUrl);
        log.info("MQTT subscribed. topic={}", "factory/+/robot/+/telemetry");
    }

    @Override
    public void messageArrived(
            String topic,
            MqttMessage message
    ) {
        meterRegistry
                .counter(
                        "robot.telemetry.received",
                        "qos", String.valueOf(message.getQos())
                )
                .increment();

        try {
            telemetryService.process(topic, message);

            meterRegistry
                    .counter("robot.telemetry.processed")
                    .increment();

        } catch (RobotOpsException exception) {
            meterRegistry
                    .counter(
                            "robot.telemetry.failed",
                            "code", exception.getErrorCode().getCode()
                    )
                    .increment();

            log.error(
                    "MQTT telemetry processing failed. topic={}, messageId={}, code={}, context={}",
                    topic,
                    message.getId(),
                    exception.getErrorCode().getCode(),
                    exception.getContext(),
                    exception
            );
        } catch (Exception exception) {
            meterRegistry
                    .counter(
                            "robot.telemetry.failed",
                            "code", "COMMON_999"
                    )
                    .increment();

            log.error(
                    "Unexpected MQTT telemetry processing error. topic={}, messageId={}",
                    topic,
                    message.getId(),
                    exception
            );
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        meterRegistry
                .counter("mqtt.connection.lost")
                .increment();

        log.warn(
                "MQTT connection lost. brokerUrl={}",
                brokerUrl,
                cause
        );
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
    }
}