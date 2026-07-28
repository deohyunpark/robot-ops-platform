package com.example.robotops.infra.openai;

import lombok.Builder;

@Builder
public record AiSummaryResponse(
        String robotId,
        String Level,
        String currentSituation,
        String possibleCause,
        String recommendation
) {

}
