package com.example.robotops.domain.service;

import com.example.robotops.domain.response.AiAnalysisResponse;
import com.example.robotops.domain.response.DailyReportResponse;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.DeviceStateResponse;
import com.example.robotops.domain.response.PriorityDeviceResponse;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.domain.response.ReportOverview;
import com.example.robotops.domain.response.ReportStatistics;
import com.example.robotops.domain.response.ThroughputResponse;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DailyReportService {

    private final DevicePriorityService devicePriorityService;
    private final AiAnalysisService aiAnalysisService;
    private final DeviceStateService deviceStateService;
    private final DeviceEventService deviceEventService;
    private final DashBoardService dashBoardService;
    private final RobotOpsGrafanaMetrics metrics;

    public DailyReportResponse createDailyReport() {
        return metrics.timeDailyReportData(this::buildDailyReport);
    }

    private DailyReportResponse buildDailyReport() {
        OffsetDateTime from =
                LocalDate.now()
                        .atStartOfDay()
                        .atOffset(ZoneOffset.of("+09:00"));

        OffsetDateTime to =
                OffsetDateTime.now();

        ReportOverview overview = getOverview(from, to);

        final ThroughputResponse throughput = dashBoardService.getThroughput();
        List<UtilizationResponse> utilizations = dashBoardService.getUtilization();

        ReportStatistics reportStatistics = ReportStatistics.of(throughput, utilizations);

        List<DeviceEventResponse> events = getTodayEvents(from, to);

        List<PriorityDeviceResponse> priority =
                devicePriorityService.getPriorityDevices();

        List<AiAnalysisResponse> analyses =
                aiAnalysisService.getRecentAiAnalysis();

        return DailyReportResponse.of(
                from,
                to,
                overview,
                reportStatistics,
                events,
                priority,
                analyses
        );
    }

    private ReportOverview getOverview(OffsetDateTime from, OffsetDateTime to) {

        List<RedisEventResponse> events =
                deviceEventService.getAllDeviceEvents();

        List<DeviceStateResponse> devices =
                deviceStateService.getAllDeviceStateList();

        int total = devices.size();
        int offline = deviceEventService.findOfflineEvents(from, to).size();
        int online = total - offline;

        int critical = Math.toIntExact(
                events.stream()
                        .filter(d -> Objects.equals(d.severity(), "CRITICAL"))
                        .count());

        int warning = Math.toIntExact(
                events.stream()
                        .filter(d -> Objects.equals(d.severity(), "WARNING"))
                        .count());

        return ReportOverview.of(total, online, offline, warning, critical);
    }

    private List<DeviceEventResponse> getTodayEvents(OffsetDateTime from, OffsetDateTime to) {
        return deviceEventService.findTodayEvents(from, to);
    }
}
