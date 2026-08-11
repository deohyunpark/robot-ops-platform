package com.example.robotops.domain.request;

import java.util.List;
import lombok.Builder;

@Builder
public record CheckListSaveRequest(
        String description,
        List<CheckListItemSaveRequest> itemSaveRequests
) {
}
