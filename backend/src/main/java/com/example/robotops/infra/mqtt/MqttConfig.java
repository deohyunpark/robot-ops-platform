package com.example.robotops.infra.mqtt;


import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqttConfig {

    @Value("${app.mqtt.brokerUrl}")
    private String brokerUrl;

    @Bean
    public MqttClient mqttClient() throws MqttException {
        String clientId = "robot-ops-" + System.currentTimeMillis();

        return new MqttClient(
                brokerUrl,
                clientId,
                new MemoryPersistence()
        );
    }
}