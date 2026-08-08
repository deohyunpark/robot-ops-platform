package com.example.robotops.domain.response;

import com.example.robotops.domain.entity.AiAnalysis;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record AiAnalysisResponse(
        String robotId,
        String riskLevel,
        int riskScore,
        String currentSituation,
        String possibleCause,
        String recommendation,
        OffsetDateTime createdAt
) {
    public static AiAnalysisResponse of(AiAnalysis analysis) {
        return AiAnalysisResponse.builder()
                .robotId(analysis.getRobotId())
                .riskScore(analysis.getRiskScore())
                .riskLevel(analysis.getRiskLevel())
                .currentSituation(analysis.getCurrentSituation())
                .possibleCause(analysis.getPossibleCause())
                .recommendation(analysis.getRecommendation())
                .createdAt(analysis.getCreatedAt())
                .build();
    }
}
