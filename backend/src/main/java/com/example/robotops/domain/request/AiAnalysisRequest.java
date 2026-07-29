package com.example.robotops.domain.request;

import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.infra.openai.AiSummaryResponse;
import lombok.Builder;

@Builder
public record AiAnalysisRequest(
        InsightFeedResponse insightFeedResponse,
        AiSummaryResponse aiSummaryResponse
) {
    public static AiAnalysisRequest of(InsightFeedResponse insightFeedResponse, AiSummaryResponse aiSummaryResponse) {
        return AiAnalysisRequest.builder()
                .aiSummaryResponse(aiSummaryResponse)
                .insightFeedResponse(insightFeedResponse)
                .build();
    }
}
