package com.example.robotops.application.telemetry.request;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.application.telemetry.request.payload.TopicInfo;

public record TelemetryPublishCommand(
        TopicInfo topicInfo,
        TelemetryPayload payload,
        byte[] rawPayload
) {

    public static TelemetryPublishCommand of(
            String topic,
            TelemetryPayload payload,
            byte[] rawPayload
    ) {
        return new TelemetryPublishCommand(
                TopicInfo.of(topic),
                payload,
                rawPayload
        );
    }
}
