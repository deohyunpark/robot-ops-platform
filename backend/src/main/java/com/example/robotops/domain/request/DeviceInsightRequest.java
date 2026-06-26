package com.example.robotops.domain.request;

import com.example.robotops.domain.deviceStateType.InsightLevel;
import lombok.Builder;

@Builder
public record DeviceInsightRequest(
        String robotId,
        InsightLevel insightLevel,
        String insightTitle,
        String insightDescription
) {
    public static DeviceInsightRequest of(String robotId,
                                          InsightLevel insightLevel,
                                          String insightTitle,
                                          String insightDescription) {
        return DeviceInsightRequest.builder()
                .robotId(robotId)
                .insightLevel(insightLevel)
                .insightTitle(insightTitle)
                .insightDescription(insightDescription)
                .build();
    }

}
