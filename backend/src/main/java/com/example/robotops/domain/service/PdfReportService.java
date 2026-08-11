package com.example.robotops.domain.service;

import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.response.DailyReportResponse;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.PriorityDeviceResponse;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportService {

    private static final DateTimeFormatter REPORT_DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm", Locale.KOREA);
    private static final DateTimeFormatter REPORT_DATE_SHORT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.KOREA);
    private static final ZoneOffset KST = ZoneOffset.of("+09:00");
    private static final String KOREAN_FONT = "Noto Sans KR";

    private final SpringTemplateEngine templateEngine;

    private static String formatDateTime(OffsetDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.atZoneSameInstant(KST).format(REPORT_DATE);
    }

    private static String formatDateShort(OffsetDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.atZoneSameInstant(KST).format(REPORT_DATE_SHORT);
    }

    private static List<DeviceEventResponse> selectDisplayEvents(DailyReportResponse report) {
        if (report.events() == null || report.events().isEmpty()) {
            return List.of();
        }

        return report.events().stream()
                .sorted(
                        Comparator
                                .comparing((DeviceEventResponse event) -> severityRank(event.severity()))
                                .thenComparing(
                                        DeviceEventResponse::createdAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                )
                .limit(25)
                .toList();
    }

    private static int severityRank(Severity severity) {
        if (severity == Severity.CRITICAL) {
            return 0;
        }
        if (severity == Severity.WARNING) {
            return 1;
        }
        return 2;
    }

    private static List<PriorityDeviceResponse> selectPriorityDevices(DailyReportResponse report) {
        if (report.priorityDevices() == null || report.priorityDevices().isEmpty()) {
            return List.of();
        }

        return report.priorityDevices().stream()
                .sorted(
                        Comparator
                                .comparing(PriorityDeviceResponse::riskScore)
                                .reversed()
                                .thenComparing(
                                        PriorityDeviceResponse::latestEventAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                )
                .limit(12)
                .toList();
    }

    private static List<Map<String, Object>> buildUtilizationRows(DailyReportResponse report) {
        if (report.statistics() == null || report.statistics().utilizationResponses() == null) {
            return List.of();
        }

        return report.statistics().utilizationResponses().stream()
                .filter(row -> row.totalSeconds() > 0)
                .sorted(
                        Comparator.comparingDouble(
                                (UtilizationResponse row) ->
                                        (double) row.activeSeconds() / row.totalSeconds()
                        ).reversed()
                )
                .limit(10)
                .map(row -> {
                    Map<String, Object> mapped = new HashMap<>();
                    mapped.put("deviceId", row.deviceId());
                    mapped.put(
                            "utilizationPercent",
                            Math.round(row.activeSeconds() * 1000.0 / row.totalSeconds()) / 10.0
                    );
                    mapped.put("activeSeconds", row.activeSeconds());
                    mapped.put("totalSeconds", row.totalSeconds());
                    return mapped;
                })
                .toList();
    }

    private static double computeAvgUtilizationPercent(DailyReportResponse report) {
        if (report.statistics() == null || report.statistics().utilizationResponses() == null) {
            return 0.0;
        }

        double average = report.statistics().utilizationResponses().stream()
                .filter(row -> row.totalSeconds() > 0)
                .mapToDouble(row -> row.activeSeconds() * 100.0 / row.totalSeconds())
                .average()
                .orElse(0.0);
        return Math.round(average * 10.0) / 10.0;
    }

    public byte[] createDailyReport(
            DailyReportResponse report,
            String aiSummary
    ) {
        String summary = aiSummary == null ? "" : aiSummary.trim();

        Context context = new Context();
        context.setVariable("report", report);
        context.setVariable("aiSummary", summary);
        context.setVariable("aiSummaryHtml", DailyReportAiSummaryFormatter.toHtml(summary));
        context.setVariable("from", report.from());
        context.setVariable("to", report.to());
        context.setVariable("formattedFrom", formatDateTime(report.from()));
        context.setVariable("formattedTo", formatDateTime(report.to()));
        context.setVariable("reportDateLabel", formatDateShort(report.from()));
        context.setVariable(
                "generatedAt",
                OffsetDateTime.now(KST).format(REPORT_DATE)
        );

        context.setVariable("displayEvents", selectDisplayEvents(report));
        context.setVariable("displayPriorityDevices", selectPriorityDevices(report));
        context.setVariable("utilizationRows", buildUtilizationRows(report));
        context.setVariable("avgUtilizationPercent", computeAvgUtilizationPercent(report));

        String html = templateEngine.process("daily-report", context);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            registerKoreanFonts(builder);
            builder.withHtmlContent(html, null);
            builder.toStream(outputStream);
            builder.run();
            return outputStream.toByteArray();
        } catch (Exception exception) {
            throw new RobotOpsException(ErrorCode.PDF_GENERATION_FAILED);
        }
    }

    private void registerKoreanFonts(PdfRendererBuilder builder) {
        registerFont(builder, "/fonts/NotoSansKR-Regular.ttf", 400);
        registerFont(builder, "/fonts/NotoSansKR-Bold.ttf", 700);
    }

    private void registerFont(
            PdfRendererBuilder builder,
            String classpath,
            int weight
    ) {

        InputStream probe =
                PdfReportService.class.getResourceAsStream(classpath);

        if (probe == null) {
            log.error(
                    "PDF font not found. classpath={}",
                    classpath
            );
            return;
        }

        log.info(
                "PDF font loaded. classpath={}",
                classpath
        );

        try {
            probe.close();
        } catch (Exception ignored) {
        }

        builder.useFont(
                () -> PdfReportService.class
                        .getResourceAsStream(classpath),
                KOREAN_FONT,
                weight,
                BaseRendererBuilder.FontStyle.NORMAL,
                true
        );
    }
}
