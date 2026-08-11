package com.example.robotops.domain.request;

import lombok.Builder;

@Builder
public record CheckListItemSaveRequest(
        Long id,
        boolean checked
) {
}
