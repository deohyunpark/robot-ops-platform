package com.example.robotops.infra.openai;

public record Message(
        String role,
        String content
) {
}
