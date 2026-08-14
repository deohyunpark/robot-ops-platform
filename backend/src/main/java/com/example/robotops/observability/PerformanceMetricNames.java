package com.example.robotops.observability;

/**
 * Grafana / Prometheus에서 사용할 메트릭 이름 상수.
 *
 * <p>기존 코드에 {@code Timer}/{@code Counter} 를 붙일 때 이 이름을 그대로 쓰면
 * 대시보드 쿼리를 통일할 수 있습니다.
 *
 * <p>예시 PromQL (Micrometer 기본 태그: application, uri, method 등)
 * <pre>
 *   histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le, uri))
 *   rate(robotops_device_event_process_seconds_count[5m])
 * </pre>
 */
public final class PerformanceMetricNames {

    private PerformanceMetricNames() {
    }

    // ── HTTP (Spring Boot Actuator 기본 + 커스텀 uri 태그) ──
    /** GET /v1/dashboard/all-events — 프론트 부트스트랩·장애 KPI */
    public static final String API_DASHBOARD_ALL_EVENTS = "robotops.api.dashboard.all_events";
    /** GET /v1/dashboard/events/{robotId} — 디바이스 상세 최근 로그 */
    public static final String API_DASHBOARD_DEVICE_EVENTS = "robotops.api.dashboard.device_events";
    /** POST /v1/events/{eventId}/resolve — 장애 해결 (Redis + MQTT) */
    public static final String API_EVENT_RESOLVE = "robotops.api.event.resolve";

    // ── Domain / Infra (커스텀 Timer·Counter 추가 시) ──
    /** DeviceEventService.process — MQTT→Kafka 핫패스 */
    public static final String DEVICE_EVENT_PROCESS = "robotops.device_event.process";
    /** RedisService.getAllEvents — ZSET 전체 scan */
    public static final String REDIS_GET_ALL_EVENTS = "robotops.redis.get_all_events";
    /** RedisService.tryAcquire — 이벤트 중복 제거 */
    public static final String REDIS_TRY_ACQUIRE = "robotops.redis.try_acquire";
    /** EventActionService.resolveEvent */
    public static final String EVENT_ACTION_RESOLVE = "robotops.event_action.resolve";
    /** InsightAiConsumer → OpenAI */
    public static final String OPENAI_INSIGHT_REQUEST = "robotops.openai.insight.request";
    /** MqttIngestor.messageArrived */
    public static final String MQTT_TELEMETRY_PROCESS = "robotops.mqtt.telemetry.process";

    // ── Kafka (KafkaProducer 에 이미 kafka.publish.success/failure 있음) ──
    public static final String KAFKA_PUBLISH_SUCCESS = "kafka.publish.success";
    public static final String KAFKA_PUBLISH_FAILURE = "kafka.publish.failure";
}
