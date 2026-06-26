package com.example.robotops.domain.response;

import lombok.Builder;

@Builder
public record TotalUtilizationResponse(
        double totalUtilization
) {
    public static TotalUtilizationResponse of(double totalUtilization) {
        return TotalUtilizationResponse.builder()
                .totalUtilization(totalUtilization)
                .build();
    }
}
