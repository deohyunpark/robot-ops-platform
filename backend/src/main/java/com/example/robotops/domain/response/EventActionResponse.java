package com.example.robotops.domain.response;

import com.example.robotops.domain.entity.EventAction;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
public record EventActionResponse(
        Long id,
        String description,
        String operator,
        OffsetDateTime createdAt
) {
    public static EventActionResponse from(EventAction eventAction) {
        return EventActionResponse.builder()
                .id(eventAction.getId())
                .description(eventAction.getDescription())
                .operator(eventAction.getOperator())
                .createdAt(eventAction.getCreatedAt())
                .build();
    }
}
