package com.example.robotops.infra.mqtt;

import com.example.robotops.application.telemetry.service.TelemetryService;
import lombok.RequiredArgsConstructor;
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

@Component
@RequiredArgsConstructor
public class MqttIngestor implements MqttCallback {

    private final TelemetryService telemetryService;

    @Value("${app.mqtt.brokerUrl}")
    private String brokerUrl;

    private MqttClient mqttClient;


    @EventListener(ApplicationReadyEvent.class)
    public void start() throws Exception {
        String clientId = "ingestor-" + System.currentTimeMillis();
        mqttClient = new MqttClient(brokerUrl, clientId, new MemoryPersistence());
        mqttClient.setCallback(this);

        MqttConnectOptions opt = new MqttConnectOptions();
        opt.setAutomaticReconnect(true);
        opt.setCleanSession(true);
        mqttClient.connect(opt);


        mqttClient.subscribe("factory/+/robot/+/telemetry", 1);
        System.out.println("[MQTT] connected: " + brokerUrl);
        System.out.println("[MQTT] subscribed: factory/+/robot/+/telemetry");
    }


    @Override
    public void messageArrived(String topic, MqttMessage message) throws Exception {
        try {
            telemetryService.process(topic, message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        System.out.println("[MQTT] lost = " + cause.getMessage());
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
    }

}

