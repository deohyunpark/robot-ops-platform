package com.example.robotops.infra.openai;

import java.util.List;

public record ChatRequest(
        String model,
        List<Message> messages
) {
}
