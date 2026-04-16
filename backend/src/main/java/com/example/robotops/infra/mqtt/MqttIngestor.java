package com.example.robotops.infra.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MqttIngestor implements MqttCallback {

    private final ObjectMapper om = new ObjectMapper();
    private final JdbcTemplate jdbcTemplate;
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


    //todo : telemetry 에 service 분리
    @Override
    public void messageArrived(String topic, MqttMessage message) throws Exception {

        // mqtt 에서 payload 추출
        Map<String, Object> p =
                om.readValue(message.getPayload(), Map.class);

        String[] arr = topic.split("/");

        String siteId = arr[1];
        String deviceId = arr[3];

        String ts = (String) p.get("ts");
        Integer seq = (Integer) p.get("seq");

        Map<String, Object> state =
                (Map<String, Object>) p.get("state");

        Map<String, Object> health =
                (Map<String, Object>) p.get("health");

        Double battery =
                ((Number) state.get("batteryPct")).doubleValue();

        Double temp =
                ((Number) health.get("tempC")).doubleValue();

        String rawJson =
                new String(message.getPayload());

        jdbcTemplate.update("""
            insert into telemetry_raw
            (
                ts,
                site_id,
                device_type,
                device_id,
                msg_id,
                battery_pct,
                temp_c,
                raw_json
            )
            values
            (
                ?::timestamptz,
                ?,
                'ROBOT',
                ?,
                ?,
                ?,
                ?,
                ?::jsonb
            )
            on conflict do nothing
        """,
                ts,
                siteId,
                deviceId,
                String.valueOf(seq),
                battery,
                temp,
                rawJson
        );

        System.out.println("[DB] inserted = " + deviceId);
    }

    @Override
    public void connectionLost(Throwable cause) {
        System.out.println("[MQTT] lost = " + cause.getMessage());
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
    }

}

