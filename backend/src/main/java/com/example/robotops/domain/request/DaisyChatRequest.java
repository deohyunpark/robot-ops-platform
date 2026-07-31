package com.example.robotops.domain.request;

import lombok.Builder;

@Builder
public record DaisyChatRequest(
        String request
) {
    public static DaisyChatRequest of(String request) {
        return DaisyChatRequest.builder()
                .request(request)
                .build();
    }
}
