package com.example.robotops.infra.kafka.producer;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.service.event.EventContext;
import com.example.robotops.domain.service.event.RedisSnapshotBuilder;
import com.example.robotops.domain.service.insight.InsightAnalyzer;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
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
    private final KafkaProducer kafkaProducer;

    private final OpenAiClient openAiClient;

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
            kafkaProducer.sendInsightFeed(insightFeedResponse);

        }
    }

    @KafkaListener(topics = "robot.device.feed", groupId = "db")
    public void insertInsight(String message) {

        InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);


    }

    //todo : insight 중복 방지
    @KafkaListener(topics = "robot.device.feed", groupId = "redis")
    public void insertInsightRedis(String message) {

        InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);

    }


    @KafkaListener(topics = "robot.device.feed", groupId = "openAi")
    public void sendInsightOpenAI(String message) {


        InsightFeedResponse insightFeedResponse = jsonUtil.fromJson(message, InsightFeedResponse.class);
        final AiSummaryResponse request = openAiClient.request(insightFeedResponse);
        websocketService.broadcastInsightFeed(request);

    }




}
