package com.example.robotops.domain.request;

public record ChecklistItem(
        String code,
        String title,
        int sequence
) {
}
