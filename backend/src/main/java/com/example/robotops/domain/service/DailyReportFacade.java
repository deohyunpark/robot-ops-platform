package com.example.robotops.domain.service;

import com.example.robotops.domain.response.DailyReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DailyReportFacade {

    private final DailyReportService dailyReportService;
    private final DailyReportAiService dailyReportAiService;
    private final PdfReportService pdfReportService;


    public byte[] createPdf() {

        // 실제 데이터
        DailyReportResponse report =
                dailyReportService
                        .createDailyReport();


        // AI 보고서 작성
        String aiSummary =
                dailyReportAiService
                        .createSummary(report);


        // PDF
        return pdfReportService
                .createDailyReport(
                        report,
                        aiSummary
                );
    }
}
