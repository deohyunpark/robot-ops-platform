package com.example.robotops.domain.service;

import com.example.robotops.domain.response.DailyReportResponse;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DailyReportFacade {

    private final DailyReportService dailyReportService;
    private final DailyReportAiService dailyReportAiService;
    private final PdfReportService pdfReportService;
    private final RobotOpsGrafanaMetrics metrics;

    public byte[] createPdf() {
        return metrics.timeDailyReportPdfTotal(this::buildPdf);
    }

    private byte[] buildPdf() {
        DailyReportResponse report = dailyReportService.createDailyReport();
        String aiSummary = dailyReportAiService.createSummary(report);
        return pdfReportService.createDailyReport(report, aiSummary);
    }
}
