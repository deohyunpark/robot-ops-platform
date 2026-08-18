package com.example.robotops.domain.response;

import com.example.robotops.domain.enums.InsightFeedDltStatus;
import java.time.OffsetDateTime;

public record InsightFeedDltResponse(
        Long id,
        String originalTopic,
        String payload,
        String robotId,
        InsightFeedDltStatus status,
        OffsetDateTime failedAt,
        OffsetDateTime replayedAt
) {
}
