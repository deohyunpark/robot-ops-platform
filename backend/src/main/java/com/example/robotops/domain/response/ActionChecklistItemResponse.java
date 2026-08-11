package com.example.robotops.domain.response;

import com.example.robotops.domain.entity.ActionChecklistItem;
import lombok.Builder;

@Builder
public record ActionChecklistItemResponse(
        Long id,
        String content,
        Integer sequence,
        boolean checked
) {
    public static ActionChecklistItemResponse of(ActionChecklistItem item) {
        return ActionChecklistItemResponse.builder()
                .id(item.getId())
                .content(item.getContent())
                .sequence(item.getSequence())
                .checked(item.isChecked())
                .build();
    }
}
