package com.example.robotops.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MqttIngestor implements MqttCallback {

    private final ObjectMapper om = new ObjectMapper();

    @Value("${app.mqtt.brokerUrl}")
    private String brokerUrl;

    @PostConstruct
    public void start() throws Exception {
        String clientId = "ingestor-" + System.currentTimeMillis();
        MqttClient client = new MqttClient(brokerUrl, clientId, new MemoryPersistence());
        client.setCallback(this);

        MqttConnectOptions opt = new MqttConnectOptions();
        opt.setAutomaticReconnect(true);
        opt.setCleanSession(true);
        client.connect(opt);

        client.subscribe("factory/+/robot/+/telemetry", 1);
        System.out.println("[MQTT] connected: " + brokerUrl);
        System.out.println("[MQTT] subscribed: factory/+/robot/+/telemetry");
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) throws Exception {
        Map<String, Object> payload = om.readValue(message.getPayload(), Map.class);
        System.out.println("[MQTT] topic=" + topic);
        System.out.println("[MQTT] payload=" + payload);
    }

    @Override public void connectionLost(Throwable cause) {
        System.out.println("[MQTT] connectionLost: " + cause.getMessage());
    }
    @Override public void deliveryComplete(IMqttDeliveryToken token) {}
}