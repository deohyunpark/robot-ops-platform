package com.example.robotops.application.telemetry.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.infra.mqtt.MqttPublisher;
import com.example.robotops.infra.redis.JsonUtil;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TelemetryResolveService {

    private final MqttPublisher mqttPublisher;
    private final JsonUtil jsonUtil;

    public void resolveTelemetry(DeviceEvent deviceEvent) {

        String topic =
                "factory/SeoulLine1/robot/"
                        + deviceEvent.getDeviceId()
                        + "/command";

        Map<String, Object> command = Map.of(
                "command", "CLEAR_EVENT",
                "eventType", deviceEvent.getEventType().name()
        );

        mqttPublisher.publish(
                topic,
                jsonUtil.toJson(command)
        );

    }
}
