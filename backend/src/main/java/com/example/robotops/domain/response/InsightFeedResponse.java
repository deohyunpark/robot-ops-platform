package com.example.robotops.domain.response;

import java.util.List;
import lombok.Builder;

@Builder
public record InsightFeedResponse(
        String robotId,
        List<DeviceInsightResponse> insightResponses,
        DeviceRiskResponse riskResponse
) {
    public static InsightFeedResponse of(String robotId, List<DeviceInsightResponse> insightResponses,
                                          DeviceRiskResponse riskResponse) {
        return InsightFeedResponse.builder()
                .robotId(robotId)
                .insightResponses(insightResponses)
                .riskResponse(riskResponse)
                .build();
    }
}
