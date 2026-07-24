package com.example.robotops.infra.openai;

import java.util.List;

public record ChatResponse(
        List<Choice> choices
) {
}
