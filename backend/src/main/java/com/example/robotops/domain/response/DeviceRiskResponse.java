package com.example.robotops.domain.response;

import com.example.robotops.domain.enums.RiskLevel;
import lombok.Builder;

@Builder
public record DeviceRiskResponse(
        int score,
        RiskLevel riskLevel
) {
    public static DeviceRiskResponse from(int score) {
        return DeviceRiskResponse.builder()
                .score(score)
                .riskLevel(RiskLevel.from(score))
                .build();
    }
}
