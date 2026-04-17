package com.example.robotops.application.telemetry.request.payload;

import lombok.Builder;

@Builder
public record TopicInfo(
        String siteId,
        String deviceId
) {
    public static TopicInfo of(String topic) {
        String[] arr = topic.split("/");
        return TopicInfo.builder()
                .siteId(arr[1])
                .deviceId(arr[3])
                .build();
    }

}
