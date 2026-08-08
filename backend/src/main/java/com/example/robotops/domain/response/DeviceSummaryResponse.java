package com.example.robotops.domain.response;

import java.util.List;
import lombok.Builder;

@Builder
public record DeviceSummaryResponse(
        DeviceStateResponse deviceStateResponse,
        List<DeviceEventResponse> deviceEventResponseList
) {
    public static DeviceSummaryResponse of(DeviceStateResponse deviceStateResponse, List<DeviceEventResponse> deviceEventResponseList) {
        return DeviceSummaryResponse.builder()
                .deviceStateResponse(deviceStateResponse)
                .deviceEventResponseList(deviceEventResponseList)
                .build();
    }
}
