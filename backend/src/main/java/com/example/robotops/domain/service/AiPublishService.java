package com.example.robotops.domain.service;

import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import com.example.robotops.observability.InsightFeedCycleTracker;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPublishService {

    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;
    private final RobotOpsGrafanaMetrics metrics;
    private final InsightFeedCycleTracker cycleTracker;
    private final DemoSessionEpochService demoSessionEpochService;

    public void publishIfNeeded(InsightFeedResponse insightFeedResponse) {
        if (!demoSessionEpochService.isActiveEpoch(insightFeedResponse.demoEpoch())) {
            metrics.recordInsightFeedPublish("skipped_stale_epoch");
            return;
        }

        String aiSignature = redisService.updatePending(insightFeedResponse);

        // 변화감지
        if (!redisService.isChangedFromPublished(insightFeedResponse, aiSignature)) {
            metrics.recordInsightFeedPublish("skipped_unchanged");
            return;
        }

        // 쿨다운
        if (!redisService.acquireAiCoolDown(insightFeedResponse.robotId())) {
            metrics.recordInsightFeedPublish("skipped_cooldown");
            return;
        }

        // cycle 시작
        cycleTracker.start(insightFeedResponse.robotId());

        Timer.Sample publishSample = metrics.startInsightFeedPublishLatency();
        kafkaProducer.sendInsightFeed(insightFeedResponse)
                .whenComplete((result, exception) -> {
                    if (exception != null) {
                        metrics.stopInsightFeedPublishLatency(publishSample, "error");
                        redisService.deleteAiCoolDown(insightFeedResponse.robotId());
                        cycleTracker.cancel(insightFeedResponse.robotId());
                        metrics.recordInsightFeedPublish("failed");
                        return;
                    }
                    metrics.stopInsightFeedPublishLatency(publishSample, "success");
                    var metadata = result.getRecordMetadata();

                    log.info(
                            "[KAFKA_SEND] key={}, partition={}, offset={}",
                            insightFeedResponse.robotId(),
                            metadata.partition(),
                            metadata.offset()
                    );

                    redisService.updatePending(insightFeedResponse);
                    metrics.recordInsightFeedPublish("published");
                });
    }
}
