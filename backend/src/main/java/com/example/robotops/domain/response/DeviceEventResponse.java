package com.example.robotops.domain.response;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.EventStatus;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record DeviceEventResponse(
        Long id,
        String deviceId,
        EventType eventType,
        Severity severity,
        EventStatus eventStatus,
        String payload,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt
) {
    public static DeviceEventResponse of(DeviceEvent event) {
        return DeviceEventResponse.builder()
                .id(event.getId())
                .deviceId(event.getDeviceId())
                .eventType(event.getEventType())
                .severity(event.getSeverity())
                .eventStatus(event.getEventStatus())
                .payload(event.getPayload().toString())
                .createdAt(event.getCreatedAt())
                .resolvedAt(event.getResolvedAt())
                .build();
    }

    public static DeviceEventResponse from(DeviceEvent deviceEvent) {
        return DeviceEventResponse.builder()
                .id(deviceEvent.getId())
                .deviceId(deviceEvent.getDeviceId())
                .eventType(deviceEvent.getEventType())
                .severity(deviceEvent.getSeverity())
                .eventStatus(deviceEvent.getEventStatus())
                .payload(deviceEvent.getPayload().toString())
                .createdAt(deviceEvent.getCreatedAt())
                .resolvedAt(deviceEvent.getResolvedAt())
                .build();
    }
}
