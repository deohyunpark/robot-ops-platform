package com.example.robotops.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 인사이트 피드 · Daisy Assistant 구간 latency/카운터 — Prometheus/Grafana 연동.
 *
 * <p>스크랩: {@code GET /actuator/prometheus}
 */
@Component
@RequiredArgsConstructor
public class RobotOpsGrafanaMetrics {

    private final MeterRegistry meterRegistry;

    // ── Insight Feed ──

    public Timer.Sample startInsightFeedDetect() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightFeedDetect(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.DETECT, "outcome", outcome));
    }

    public void recordInsightFeedPublish(String result) {
        counter(InsightFeedMetricNames.PUBLISH, "result", result).increment();
    }

    public Timer.Sample startInsightFeedPublishLatency() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightFeedPublishLatency(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.PUBLISH_LATENCY, "outcome", outcome));
    }

    public Timer.Sample startInsightOpenAiRequest() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightOpenAiRequest(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.OPENAI_REQUEST, "outcome", outcome));
    }

    public Timer.Sample startInsightAnalysisSave() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightAnalysisSave(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.ANALYSIS_SAVE, "outcome", outcome));
    }

    public Timer.Sample startInsightWsBroadcast() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightWsBroadcast(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.WS_BROADCAST, "outcome", outcome));
    }

    public Timer.Sample startInsightFeedApi() {
        return Timer.start(meterRegistry);
    }

    public void stopInsightFeedApi(Timer.Sample sample, String outcome) {
        sample.stop(timer(InsightFeedMetricNames.API_FEED, "outcome", outcome));
    }

    public void recordInsightFeedDlt(String originalTopic) {
        counter(InsightFeedMetricNames.DLT, "topic", sanitizeTag(originalTopic)).increment();
    }

    public void recordInsightFeedCycle(long durationMs, String stage, String outcome) {
        timer(InsightFeedMetricNames.CYCLE, "stage", stage, "outcome", outcome)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    // ── Daisy Assistant / Daily Report ──

    public Timer.Sample startDaisyChat() {
        return Timer.start(meterRegistry);
    }

    public void stopDaisyChat(Timer.Sample sample, String outcome) {
        sample.stop(timer(DaisyMetricNames.CHAT, "outcome", outcome));
    }

    public <T> T timeDailyReportTool(Supplier<T> block) {
        return timeDual(
                DaisyMetricNames.DAILY_REPORT_TOOL,
                DaisyMetricNames.DAILY_REPORT_TOOL_CYCLE,
                block
        );
    }

    public <T> T timeDailyReportData(Supplier<T> block) {
        return time(DaisyMetricNames.DAILY_REPORT_DATA, "outcome", "success", block);
    }

    public String timeDailyReportAiSummary(Supplier<String> block) {
        return time(DaisyMetricNames.DAILY_REPORT_AI_SUMMARY, "outcome", "success", block);
    }

    public byte[] timeDailyReportPdfRender(Supplier<byte[]> block) {
        return time(DaisyMetricNames.DAILY_REPORT_PDF_RENDER, "outcome", "success", block);
    }

    public byte[] timeDailyReportPdfTotal(Supplier<byte[]> block) {
        return time(DaisyMetricNames.DAILY_REPORT_PDF_TOTAL, "outcome", "success", block);
    }

    public void recordDuration(String metric, long durationMs, String... tags) {
        timer(metric, tags).record(durationMs, TimeUnit.MILLISECONDS);
    }

    private <T> T timeDual(String primary, String secondary, Supplier<T> block) {
        long start = System.nanoTime();
        try {
            T result = block.get();
            long durationMs = nanosToMs(start);
            recordDuration(primary, durationMs, "outcome", "success");
            recordDuration(secondary, durationMs, "outcome", "success");
            return result;
        } catch (RuntimeException ex) {
            long durationMs = nanosToMs(start);
            recordDuration(primary, durationMs, "outcome", "error");
            recordDuration(secondary, durationMs, "outcome", "error");
            throw ex;
        }
    }

    private <T> T time(String metric, String tagKey, String tagValue, Supplier<T> block) {
        long start = System.nanoTime();
        try {
            T result = block.get();
            recordDuration(metric, nanosToMs(start), tagKey, tagValue);
            return result;
        } catch (RuntimeException ex) {
            recordDuration(metric, nanosToMs(start), tagKey, "error");
            throw ex;
        }
    }

    private Timer timer(String name, String... tags) {
        return Timer.builder(name)
                .tags(tags)
                .register(meterRegistry);
    }

    private Counter counter(String name, String... tags) {
        return Counter.builder(name)
                .tags(tags)
                .register(meterRegistry);
    }

    private static long nanosToMs(long startNanos) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
    }

    private static String sanitizeTag(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.replace("\"", "'");
    }
}
