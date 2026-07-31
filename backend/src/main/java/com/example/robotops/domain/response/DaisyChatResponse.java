package com.example.robotops.domain.response;

import lombok.Builder;

@Builder
public record DaisyChatResponse(
        String answer
) {
    public static DaisyChatResponse of(String answer) {
        return DaisyChatResponse.builder()
                .answer(answer)
                .build();
    }
}
