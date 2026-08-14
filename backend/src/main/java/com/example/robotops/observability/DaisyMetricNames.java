package com.example.robotops.observability;

/**
 * Grafana / Prometheus 커스텀 메트릭 이름 — Daisy Assistant · Daily Report Tool.
 */
public final class DaisyMetricNames {

    private DaisyMetricNames() {
    }

    /** POST /v1/daisy/chat */
    public static final String CHAT = "robotops.daisy.chat";
    /** DailyReportTool.getDailyReport (@Tool) — 1사이클(데이터 집계 전체) */
    public static final String DAILY_REPORT_TOOL = "robotops.daisy.daily_report.tool";
    /** {@link #DAILY_REPORT_TOOL} 1사이클 (Grafana 패널용 별칭) */
    public static final String DAILY_REPORT_TOOL_CYCLE = "robotops.daisy.daily_report.tool_cycle";
    /** DailyReportService.createDailyReport — 데이터 집계 */
    public static final String DAILY_REPORT_DATA = "robotops.daisy.daily_report.data";
    /** DailyReportAiService.createSummary — AI 요약 */
    public static final String DAILY_REPORT_AI_SUMMARY = "robotops.daisy.daily_report.ai_summary";
    /** PdfReportService.createDailyReport — PDF 렌더 */
    public static final String DAILY_REPORT_PDF_RENDER = "robotops.daisy.daily_report.pdf_render";
    /** DailyReportFacade.createPdf — 전체 PDF API */
    public static final String DAILY_REPORT_PDF_TOTAL = "robotops.daisy.daily_report.pdf_total";
}
