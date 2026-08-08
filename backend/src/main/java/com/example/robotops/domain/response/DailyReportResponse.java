package com.example.robotops.domain.response;

import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;

@Builder
public record DailyReportResponse(
        OffsetDateTime from,
        OffsetDateTime to,
        ReportOverview overview,
        ReportStatistics statistics,
        List<DeviceEventResponse> events,
        List<PriorityDeviceResponse> priorityDevices,
        List<AiAnalysisResponse> aiAnalyses

) {
    public static DailyReportResponse of(OffsetDateTime from, OffsetDateTime to, ReportOverview overview,
                                         ReportStatistics statistics, List<DeviceEventResponse> events,
                                         List<PriorityDeviceResponse> priorityDeviceResponses, List<AiAnalysisResponse> aiAnalyses) {
        return DailyReportResponse.builder()
                .from(from)
                .to(to)
                .overview(overview)
                .statistics(statistics)
                .events(events)
                .priorityDevices(priorityDeviceResponses)
                .aiAnalyses(aiAnalyses)
                .build();
    }
}
