package com.example.robotops.domain.response;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record DeviceEventResponse(
        String deviceId,
        EventType eventType,
        Severity severity,
        String payload,
        OffsetDateTime createdAt
) {
    public static DeviceEventResponse of(DeviceEvent event) {
        return DeviceEventResponse.builder()
                .deviceId(event.getDeviceId())
                .eventType(event.getEventType())
                .severity(event.getSeverity())
                .payload(event.getPayload().toString())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
