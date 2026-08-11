package com.example.robotops.domain.response;

import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;

@Builder
public record AckResponse(
        Long checkListId,
        String operation,
        OffsetDateTime ackStartTime,
        List<ActionChecklistItemResponse> actionChecklistItemResponses
) {
    public static AckResponse from(EventActionResponse eventActionResponse, List<ActionChecklistItemResponse> actionChecklistItems) {
        return AckResponse.builder()
                .checkListId(eventActionResponse.id())
                .operation(eventActionResponse.operator())
                .ackStartTime(eventActionResponse.createdAt())
                .actionChecklistItemResponses(actionChecklistItems)
                .build();
    }
}
