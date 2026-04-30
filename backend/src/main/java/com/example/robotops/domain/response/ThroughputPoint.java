package com.example.robotops.domain.response;

import lombok.Builder;

@Builder
public record ThroughputPoint(
        String time,
        long count
) {
}
