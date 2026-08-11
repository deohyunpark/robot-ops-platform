package com.example.robotops.domain.request;

public record AckRequest(
        Long eventId,
        String operator
) {
}
