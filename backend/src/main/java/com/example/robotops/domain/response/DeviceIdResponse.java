package com.example.robotops.domain.response;

import lombok.Builder;

@Builder
public record DeviceIdResponse(
        String deviceId
) {
    public static DeviceIdResponse of(String deviceId) {
        return DeviceIdResponse.builder().deviceId(deviceId).build();
    }
}
