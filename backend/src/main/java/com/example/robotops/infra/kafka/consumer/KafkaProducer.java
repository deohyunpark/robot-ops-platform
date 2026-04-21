package com.example.robotops.infra.kafka.consumer;

import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class KafkaProducer {

    private final KafkaTemplate<String, String> template;
    private final JsonUtil jsonUtil;

    public void sendTelemetry(TelemetryRawRequest telemetryRawRequest) {
        template.send(
                "robot.telemetry.raw",
                telemetryRawRequest.deviceId(),
                jsonUtil.toJson(telemetryRawRequest)
        );
    }

    public void sendDeviceState(DeviceStateRequest deviceStateRequest) {
        template.send(
                "robot.device.state",
                deviceStateRequest.deviceId(),
                jsonUtil.toJson(deviceStateRequest)
        );
    }

    public void sendDashBoard(TelemetryPayload telemetryPayload) {
        template.send(
                "robot.device.dash-board",
                telemetryPayload.robotId(),
                jsonUtil.toJson(telemetryPayload)
        );
    }
}
