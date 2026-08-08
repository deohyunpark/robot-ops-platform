package com.example.robotops.domain.response;

import java.time.Instant;

public record DemoSessionResponse(
        String status,
        Instant expireAt
) {
}
