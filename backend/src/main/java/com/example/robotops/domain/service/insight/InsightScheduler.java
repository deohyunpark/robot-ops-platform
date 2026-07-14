package com.example.robotops.domain.service.insight;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.service.event.EventContext;
import com.example.robotops.domain.service.event.RedisSnapshotBuilder;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InsightScheduler {

    private final RedisSnapshotBuilder redisSnapshotBuilder;
    private final InsightAnalyzer insightAnalyzer;
    private final KafkaProducer kafkaProducer;

    @Scheduled(fixedRate = 5000) //5초마다 체크
    public void detectInsights(TelemetryPayload payload) {

        log.info("[SCHEDULER] detectInsight running");

        //todo InsightAnalyzer 실행
        // 흐름 : telemetry -> redis -> insight scheduler

        // Insight 생성시 필요한 context 생성
        EventContext eventContext = new EventContext(payload, redisSnapshotBuilder.build(payload));

        InsightFeedResponse insightFeedResponse = insightAnalyzer.analyze(eventContext);

        // 3. request DB, Redis, websocket 발행 -> kafka
        kafkaProducer.sendInsightFeed(insightFeedResponse);
    }
}
