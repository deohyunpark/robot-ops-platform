package com.example.robotops.observability;

/**
 * Grafana / Prometheus 커스텀 메트릭 이름 — 인사이트 피드 · Daisy Assistant.
 *
 * <p>Prometheus 노출 예: {@code robotops_insight_feed_detect_seconds_count}
 */
public final class InsightFeedMetricNames {

    private InsightFeedMetricNames() {
    }

    /** Kafka robot.device.feed.detect → InsightAnalyzer */
    public static final String DETECT = "robotops.insight.feed.detect";
    /** AiPublishService.publishIfNeeded 결과 (counter) */
    public static final String PUBLISH = "robotops.insight.feed.publish";
    /** AiPublishService → Kafka ack 구간 latency */
    public static final String PUBLISH_LATENCY = "robotops.insight.feed.publish.latency";
    /** Kafka robot.device.feed → OpenAI */
    public static final String OPENAI_REQUEST = "robotops.insight.openai.request";
    /** Kafka robot.device.feed.analysis → DB save */
    public static final String ANALYSIS_SAVE = "robotops.insight.analysis.save";
    /** Kafka robot.device.feed.analysis → WS broadcast */
    public static final String WS_BROADCAST = "robotops.insight.feed.ws";
    /** GET /v1/dashboard/feed */
    public static final String API_FEED = "robotops.insight.feed.api";
    /** InsightAiConsumer DLT */
    public static final String DLT = "robotops.insight.feed.dlt";
    /** detect → WS 브로드캐스트 1사이클 */
    public static final String CYCLE = "robotops.insight.feed.cycle";
}
