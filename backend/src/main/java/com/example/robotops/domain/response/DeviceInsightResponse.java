package com.example.robotops.domain.response;

import java.util.Map;
import lombok.Builder;

@Builder
public record DeviceInsightResponse(
        String insightTitle,
        String insightDescription,
        String insightRecommendation,
        Map<String, Object> payloadType,
        int score

) {
    public static DeviceInsightResponse of(
                                            String insightTitle,
                                           String insightDescription,
                                           String insightRecommendation,
                                           Map<String, Object> payloadType,
                                            int score) {
        return DeviceInsightResponse.builder()
                .insightTitle(insightTitle)
                .insightDescription(insightDescription)
                .insightRecommendation(insightRecommendation)
                .payloadType(payloadType)
                .score(score)
                .build();
    }

}
