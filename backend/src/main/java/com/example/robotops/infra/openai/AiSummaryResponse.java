package com.example.robotops.infra.openai;

public record AiSummaryResponse(
        String robotId,
        String Level,
        String currentSituation,
        String possibleCause,
        String recommendation
) {

}
