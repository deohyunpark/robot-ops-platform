package com.example.robotops.domain.response;

import java.util.List;
import lombok.Builder;

@Builder
public record InsightFeedResponse(
        List<DeviceInsightResponse> insightResponses,
        DeviceRiskResponse riskResponse
) {
    public static InsightFeedResponse of( List<DeviceInsightResponse> insightResponses,
                                          DeviceRiskResponse riskResponse) {
        return InsightFeedResponse.builder()
                .insightResponses(insightResponses)
                .riskResponse(riskResponse)
                .build();
    }
}
