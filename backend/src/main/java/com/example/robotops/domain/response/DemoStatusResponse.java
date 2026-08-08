package com.example.robotops.domain.response;

public record DemoStatusResponse(
        String status,
        long remainingSeconds
) {
}
