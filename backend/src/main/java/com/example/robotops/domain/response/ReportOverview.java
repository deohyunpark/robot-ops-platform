package com.example.robotops.domain.response;

import lombok.Builder;

@Builder
public record ReportOverview(
        int totalDevices,
        int online,
        int offline,
        int warning,
        int critical
) {

    public static ReportOverview of(int totalDevices, int online, int offline, int warning, int critical) {
        return ReportOverview.builder()
                .totalDevices(totalDevices)
                .online(online)
                .offline(offline)
                .warning(warning)
                .critical(critical)
                .build();
    }
}
