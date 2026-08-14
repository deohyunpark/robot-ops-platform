package com.example.robotops.infra.kafka.consumer;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.request.AiAnalysisRequest;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.service.AiAnalysisService;
import com.example.robotops.domain.service.AiPublishService;
import com.example.robotops.domain.service.event.EventContext;
import com.example.robotops.domain.service.event.RedisSnapshotBuilder;
import com.example.robotops.domain.service.insight.InsightAnalyzer;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.openai.AiSummaryResponse;
import com.example.robotops.infra.openai.OpenAiClient;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.websocket.WebsocketService;
import com.example.robotops.observability.InsightFeedCycleTracker;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsightAiConsumer {

    private final JsonUtil jsonUtil;
    private final InsightAnalyzer insightAnalyzer;
    private final RedisSnapshotBuilder redisSnapshotBuilder;
    private final WebsocketService websocketService;

    private final OpenAiClient openAiClient;
    private final AiPublishService aiPublishService;
    private final AiAnalysisService aiAnalysisService;

    private final KafkaProducer kafkaProducer;
    private final RobotOpsGrafanaMetrics metrics;
    private final InsightFeedCycleTracker cycleTracker;

    @KafkaListener(topics = "robot.device.feed.detect", groupId = "all")
    public void detectInsight(String message) {
        // 피드 생성
        Timer.Sample sample = metrics.startInsightFeedDetect();
        try {
            TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
            EventContext eventContext = new EventContext(
                    telemetryPayload,
                    redisSnapshotBuilder.build(telemetryPayload)
            );
            InsightFeedResponse insightFeedResponse = insightAnalyzer.analyze(eventContext);

            if (insightFeedResponse != null) {
                aiPublishService.publishIfNeeded(insightFeedResponse);
                metrics.stopInsightFeedDetect(sample, "detected");
            } else {
                metrics.stopInsightFeedDetect(sample, "none");
            }
        } catch (RuntimeException ex) {
            metrics.stopInsightFeedDetect(sample, "error");
            throw ex;
        }
    }

    @RetryableTopic(
            attempts = "4",
            backoff = @Backoff(
                    delay = 1_000,
                    multiplier = 2.0,
                    maxDelay = 10_000
            ),
            retryTopicSuffix = "-retry",
            dltTopicSuffix = "-dlt"
    )
    @KafkaListener(
            topics = "robot.device.feed",
            groupId = "openAi",
            concurrency = "${robotops.kafka.insight-openai-concurrency:6}"
    )
    public void sendInsightOpenAI(String message) {
        Timer.Sample sample = metrics.startInsightOpenAiRequest();
        try {
            InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);
            AiSummaryResponse response = openAiClient.request(insightFeedResponse);
            kafkaProducer.createAiAnalysis(AiAnalysisRequest.of(insightFeedResponse, response));
            metrics.stopInsightOpenAiRequest(sample, "success");
        } catch (RuntimeException ex) {
            metrics.stopInsightOpenAiRequest(sample, "error");
            throw ex;
        }
    }

    @DltHandler
    public void handleDlt(
            String message,
            @Header(KafkaHeaders.RECEIVED_TOPIC)
            String originalTopic
    ) {
        metrics.recordInsightFeedDlt(originalTopic);
        log.error(
                "AI message moved to DLT. originalTopic={}, message={}",
                originalTopic,
                message
        );
    }

    @KafkaListener(topics = "robot.device.feed.analysis", groupId = "db")
    public void saveAiAnalysis(String message) {
        Timer.Sample sample = metrics.startInsightAnalysisSave();
        try {
            AiAnalysisRequest aiAnalysisRequest = jsonUtil.fromJson(message, AiAnalysisRequest.class);
            aiAnalysisService.saveAiAnalysis(aiAnalysisRequest);
            metrics.stopInsightAnalysisSave(sample, "success");
        } catch (RuntimeException ex) {
            metrics.stopInsightAnalysisSave(sample, "error");
            throw ex;
        }
    }

    @KafkaListener(topics = "robot.device.feed.analysis", groupId = "ws")
    public void sendAiAnalysis(String message) {
        Timer.Sample sample = metrics.startInsightWsBroadcast();
        AiAnalysisRequest aiAnalysisRequest = jsonUtil.fromJson(message, AiAnalysisRequest.class);
        try {
            websocketService.broadcastInsightFeed(aiAnalysisRequest.aiSummaryResponse());
            cycleTracker.completeDelivered(aiAnalysisRequest.insightFeedResponse().robotId());
            metrics.stopInsightWsBroadcast(sample, "success");
        } catch (RuntimeException ex) {
            cycleTracker.failDelivered(aiAnalysisRequest.insightFeedResponse().robotId());
            metrics.stopInsightWsBroadcast(sample, "error");
            throw ex;
        }
    }
}
