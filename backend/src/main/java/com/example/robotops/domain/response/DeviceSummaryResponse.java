package com.example.robotops.domain.response;

import java.util.List;
import lombok.Builder;

@Builder
public record DeviceSummaryResponse(
        DeviceStateResponse deviceStateResponse,
        List<DeviceEventResponse> deviceEventResponseList,
        AiAnalysisResponse aiAnalysisResponse
) {
    public static DeviceSummaryResponse of(DeviceStateResponse deviceStateResponse, List<DeviceEventResponse> deviceEventResponseList, AiAnalysisResponse aiAnalysisResponse) {
        return DeviceSummaryResponse.builder()
                .deviceStateResponse(deviceStateResponse)
                .deviceEventResponseList(deviceEventResponseList)
                .aiAnalysisResponse(aiAnalysisResponse)
                .build();
    }
}
