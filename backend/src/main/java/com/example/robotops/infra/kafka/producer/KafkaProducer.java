package com.example.robotops.infra.kafka.producer;

import com.example.robotops.application.telemetry.request.TelemetryRawRequest;
import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.request.AiAnalysisRequest;
import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.redis.JsonUtil;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaProducer {

    private static final String TELEMETRY_RAW_TOPIC =
            "robot.telemetry.raw";

    private static final String TELEMETRY_PAYLOAD_TOPIC =
            "robot.telemetry.payload";

    private static final String DEVICE_STATE_TOPIC =
            "robot.device.state";

    private static final String DASHBOARD_TOPIC =
            "robot.device.dash-board";

    private static final String DEVICE_EVENT_TOPIC =
            "robot.device.event";

    private static final String DEVICE_EVENT_DETECTED_TOPIC =
            "robot.device.event.detected";

    private static final String DEVICE_MISSION_TOPIC =
            "robot.device.mission";

    private static final String DEVICE_MISSION_DONE_TOPIC =
            "robot.device.mission.done";

    private static final String DEVICE_THROUGHPUT_TOPIC =
            "robot.device.throughput";

    private static final String DEVICE_UTILIZATION_TOPIC =
            "robot.device.utilization";

    private static final String DEVICE_EVENTS_TOPIC =
            "robot.device.events";

    private static final String DEVICE_OFFLINE_TOPIC =
            "robot.device.offline";

    private static final String INSIGHT_DETECT_TOPIC =
            "robot.device.feed.detect";

    private static final String INSIGHT_FEED_TOPIC =
            "robot.device.feed";

    private static final String AI_ANALYSIS_TOPIC =
            "robot.device.feed.analysis";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final JsonUtil jsonUtil;
    private final MeterRegistry meterRegistry;

    public CompletableFuture<SendResult<String, String>> sendTelemetry(
            TelemetryRawRequest request
    ) {
        return publishJson(
                TELEMETRY_RAW_TOPIC,
                request.deviceId(),
                request
        );
    }

    public CompletableFuture<SendResult<String, String>> setRedis(
            TelemetryPayload payload
    ) {
        return publishJson(
                TELEMETRY_PAYLOAD_TOPIC,
                payload.robotId(),
                payload
        );
    }

    public CompletableFuture<SendResult<String, String>> sendDeviceState(
            DeviceStateRequest request
    ) {
        return publishJson(
                DEVICE_STATE_TOPIC,
                request.deviceId(),
                request
        );
    }

    public CompletableFuture<SendResult<String, String>> sendDashboard(
            TelemetryPayload payload
    ) {
        return publishJson(
                DASHBOARD_TOPIC,
                payload.robotId(),
                payload
        );
    }

    public CompletableFuture<SendResult<String, String>> detectDeviceEvent(
            TelemetryPayload payload
    ) {
        return publishJson(
                DEVICE_EVENT_TOPIC,
                payload.robotId(),
                payload
        );
    }

    public CompletableFuture<SendResult<String, String>> sendDeviceEvent(
            DeviceEvent event
    ) {
        return publishJson(
                DEVICE_EVENT_DETECTED_TOPIC,
                event.getDeviceId(),
                event
        );
    }

    public CompletableFuture<SendResult<String, String>> detectMission(
            TelemetryPayload payload
    ) {
        return publishJson(
                DEVICE_MISSION_TOPIC,
                payload.robotId(),
                payload
        );
    }

    public CompletableFuture<SendResult<String, String>> countDone(
            String deviceId
    ) {
        return publishValue(
                DEVICE_MISSION_DONE_TOPIC,
                deviceId
        );
    }

    public CompletableFuture<SendResult<String, String>> sendThroughput(
            String deviceId
    ) {
        return publishValue(
                DEVICE_THROUGHPUT_TOPIC,
                deviceId
        );
    }

    public CompletableFuture<SendResult<String, String>> sendTotalUtilization(
            String deviceId
    ) {
        return publishValue(
                DEVICE_UTILIZATION_TOPIC,
                deviceId
        );
    }

    public CompletableFuture<SendResult<String, String>> sendAllEvents(
            String deviceId
    ) {
        return publishValue(
                DEVICE_EVENTS_TOPIC,
                deviceId
        );
    }

    public CompletableFuture<SendResult<String, String>> sendOfflineList(
            String deviceId
    ) {
        return publishValue(
                DEVICE_OFFLINE_TOPIC,
                deviceId
        );
    }

    public CompletableFuture<SendResult<String, String>> createInsightFeed(
            TelemetryPayload payload
    ) {
        return publishJson(
                INSIGHT_DETECT_TOPIC,
                payload.robotId(),
                payload
        );
    }

    public CompletableFuture<SendResult<String, String>> sendInsightFeed(
            InsightFeedResponse response
    ) {
        return publishJson(
                INSIGHT_FEED_TOPIC,
                response.robotId(),
                response
        );
    }

    public CompletableFuture<SendResult<String, String>> createAiAnalysis(
            AiAnalysisRequest request
    ) {
        return publishJson(
                AI_ANALYSIS_TOPIC,
                request.insightFeedResponse().robotId(),
                request
        );
    }

    private CompletableFuture<SendResult<String, String>> publishJson(
            String topic,
            String key,
            Object value
    ) {
        String payload = jsonUtil.toJson(value);

        return publish(
                topic,
                key,
                payload
        );
    }

    private CompletableFuture<SendResult<String, String>> publishValue(
            String topic,
            String value
    ) {
        return publish(
                topic,
                value,
                value
        );
    }

    private CompletableFuture<SendResult<String, String>> publish(
            String topic,
            String key,
            String payload
    ) {
        try {
            return kafkaTemplate
                    .send(topic, key, payload)
                    .whenComplete((result, exception) -> {
                        if (exception == null) {
                            recordSuccess(topic);

                            log.debug(
                                    "Kafka publish succeeded. topic={}, key={}, partition={}, offset={}",
                                    topic,
                                    key,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset()
                            );

                            return;
                        }

                        recordFailure(topic, exception);

                        log.error(
                                "Kafka publish failed. topic={}, key={}",
                                topic,
                                key,
                                exception
                        );
                    });

        } catch (KafkaException exception) {
            recordFailure(topic, exception);

            throw new RobotOpsException(
                    ErrorCode.KAFKA_PUBLISH_FAILED,
                    contextOf(topic, key),
                    exception
            );
        }
    }

    private void recordSuccess(String topic) {
        meterRegistry
                .counter(
                        "kafka.publish.success",
                        "topic", topic
                )
                .increment();
    }

    private void recordFailure(
            String topic,
            Throwable exception
    ) {
        meterRegistry
                .counter(
                        "kafka.publish.failure",
                        "topic", topic,
                        "exception",
                        exception.getClass().getSimpleName()
                )
                .increment();
    }

    private Map<String, Object> contextOf(
            String topic,
            String key
    ) {
        Map<String, Object> context = new HashMap<>();
        context.put("topic", topic);
        context.put("key", key);
        return context;
    }
}