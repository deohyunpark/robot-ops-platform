package com.example.robotops.domain.request;

import lombok.Builder;

@Builder
public record CheckListItemSaveRequest(
        Long id,
        boolean checked
) {
    public static CheckListItemSaveRequest of(Long id, boolean checked) {
        return new CheckListItemSaveRequest(id, checked);
    }
}
