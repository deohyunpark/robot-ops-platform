package com.example.robotops.domain.response;

import java.util.List;
import lombok.Builder;

@Builder
public record ReportStatistics(
        ThroughputResponse throughputResponse,
        List<UtilizationResponse> utilizationResponses
) {
    public static ReportStatistics of(ThroughputResponse throughputResponse, List<UtilizationResponse> utilizationResponses) {
        return ReportStatistics.builder()
                .throughputResponse(throughputResponse)
                .utilizationResponses(utilizationResponses)
                .build();
    }
}
