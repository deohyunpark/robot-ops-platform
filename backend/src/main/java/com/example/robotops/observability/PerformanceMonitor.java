package com.example.robotops.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 커스텀 구간 latency 기록용 스켈레톤.
 *
 * <p><b>기존 Service 코드에 아직 연결하지 않았습니다.</b>
 * 연결 예시 (DeviceEventService.process 상단):
 * <pre>{@code
 *   Timer.Sample sample = performanceMonitor.startDeviceEventProcess();
 *   try {
 *     // 기존 로직
 *   } finally {
 *     performanceMonitor.stopDeviceEventProcess(sample);
 *   }
 * }</pre>
 *
 * <p>활성화: {@code application.yml} 에 {@code robotops.metrics.custom-enabled=true}
 */
@Component
@ConditionalOnProperty(name = "robotops.metrics.custom-enabled", havingValue = "true")
@RequiredArgsConstructor
public class PerformanceMonitor {

    private final MeterRegistry meterRegistry;

    public Timer.Sample startDeviceEventProcess() {
        return Timer.start(meterRegistry);
    }

    public void stopDeviceEventProcess(Timer.Sample sample) {
        // TODO: 기존 DeviceEventService.process finally 블록에서 호출
        sample.stop(buildTimer(PerformanceMetricNames.DEVICE_EVENT_PROCESS));
    }

    public Timer.Sample startRedisGetAllEvents() {
        return Timer.start(meterRegistry);
    }

    public void stopRedisGetAllEvents(Timer.Sample sample) {
        // TODO: RedisService.getAllEvents 반환 직전
        sample.stop(buildTimer(PerformanceMetricNames.REDIS_GET_ALL_EVENTS));
    }

    public Timer.Sample startEventActionResolve() {
        return Timer.start(meterRegistry);
    }

    public void stopEventActionResolve(Timer.Sample sample) {
        // TODO: EventActionService.resolveEvent 종료 시
        sample.stop(buildTimer(PerformanceMetricNames.EVENT_ACTION_RESOLVE));
    }

    public Timer.Sample startOpenAiInsightRequest() {
        return Timer.start(meterRegistry);
    }

    public void stopOpenAiInsightRequest(Timer.Sample sample) {
        // TODO: InsightAiConsumer.sendInsightOpenAI OpenAI 호출 구간
        sample.stop(buildTimer(PerformanceMetricNames.OPENAI_INSIGHT_REQUEST));
    }

    public void recordMqttTelemetryProcess(long durationMs) {
        // TODO: MqttIngestor.messageArrived 에서 TelemetryService.process 구간만 측정
        meterRegistry.timer(PerformanceMetricNames.MQTT_TELEMETRY_PROCESS)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void incrementRedisTryAcquire(boolean acquired) {
        // TODO: RedisService.tryAcquire — acquired / deduped 카운터 분리
        meterRegistry.counter(
                PerformanceMetricNames.REDIS_TRY_ACQUIRE,
                "result", acquired ? "acquired" : "deduped"
        ).increment();
    }

    private Timer buildTimer(String name) {
        return Timer.builder(name)
                .description("Robot Ops custom latency — see PerformanceMonitoringPlan")
                .register(meterRegistry);
    }
}
