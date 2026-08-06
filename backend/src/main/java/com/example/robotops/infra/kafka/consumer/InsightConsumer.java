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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class InsightConsumer {

    private final JsonUtil jsonUtil;
    private final InsightAnalyzer insightAnalyzer;
    private final RedisSnapshotBuilder redisSnapshotBuilder;
    private final WebsocketService websocketService;

    private final OpenAiClient openAiClient;
    private final AiPublishService aiPublishService;
    private final AiAnalysisService aiAnalysisService;

    private final KafkaProducer kafkaProducer;

    @KafkaListener(topics = "robot.device.feed.detect", groupId = "all")
    public void detectInsight(String message) {


        // 1. mqtt -> payload 변환
        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);

        // 2. 이벤트 생성시 필요한 context 생성
        EventContext eventContext = new EventContext(telemetryPayload, redisSnapshotBuilder.build(telemetryPayload));

        // 3. rule check 후 event 생성
        InsightFeedResponse insightFeedResponse = insightAnalyzer.analyze(eventContext);

        // 3. request DB, Redis, websocket 발행 -> kafka
        if (insightFeedResponse != null) {
            aiPublishService.publishIfNeeded(insightFeedResponse);
        }
    }


    @KafkaListener(topics = "robot.device.feed", groupId = "openAi", concurrency = "3")
    public void sendInsightOpenAI(String message) {

        InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);
        AiSummaryResponse response = openAiClient.request(insightFeedResponse);
        // todo : kafka 쪼개야함

        AiAnalysisRequest aiAnalysisRequest = AiAnalysisRequest.of(insightFeedResponse, response);
        kafkaProducer.createAiAnalysis(aiAnalysisRequest);

    }

    @KafkaListener(topics = "robot.device.feed.analysis", groupId = "db")
    public void saveAiAnalysis(String message) {

        AiAnalysisRequest aiAnalysisRequest = jsonUtil.fromJson(message, AiAnalysisRequest.class);
        aiAnalysisService.saveAiAnalysis(aiAnalysisRequest);
    }

    @KafkaListener(topics = "robot.device.feed.analysis", groupId = "ws")
    public void sendAiAnalysis(String message) {

        AiAnalysisRequest aiAnalysisRequest = jsonUtil.fromJson(message, AiAnalysisRequest.class);

        websocketService.broadcastInsightFeed(aiAnalysisRequest.aiSummaryResponse());
    }




}
