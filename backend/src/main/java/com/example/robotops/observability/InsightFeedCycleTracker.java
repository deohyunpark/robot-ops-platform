package com.example.robotops.observability;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 인사이트 피드 1사이클(Kafka publish → OpenAI → WS) 경과 시간 추적.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InsightFeedCycleTracker {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final String KEY_PATTERN = "ai:robot:%s:cycle:start";

    private final StringRedisTemplate stringRedisTemplate;
    private final RobotOpsGrafanaMetrics metrics;

    /** Kafka publish 성공 시 사이클 시작 (skip/cooldown 이후 실제 발행된 건만) */
    public void start(String robotId) {
        stringRedisTemplate.opsForValue().set(
                key(robotId),
                String.valueOf(System.currentTimeMillis()),
                TTL
        );
    }

    /** publish skip/fail 시 사이클 취소 */
    public void cancel(String robotId) {
        stringRedisTemplate.delete(key(robotId));
    }

    /** WS 브로드캐스트 완료 = 사용자에게 피드 도달 */
    public void completeDelivered(String robotId) {
        complete(robotId, "delivered", "success");
    }

    public void failDelivered(String robotId) {
        complete(robotId, "delivered", "error");
    }

    private void complete(String robotId, String stage, String outcome) {
        String raw = stringRedisTemplate.opsForValue().get(key(robotId));
        if (raw == null) {
            log.warn(
                    "[METRIC] insight feed cycle missing start key. robotId={}, stage={}, outcome={}",
                    robotId,
                    stage,
                    outcome
            );
            return;
        }
        stringRedisTemplate.delete(key(robotId));

        long elapsedMs = System.currentTimeMillis() - Long.parseLong(raw);
        metrics.recordInsightFeedCycle(elapsedMs, stage, outcome);
        log.info(
                "[METRIC] insight feed cycle {}ms. robotId={}, stage={}, outcome={}",
                elapsedMs,
                robotId,
                stage,
                outcome
        );
    }

    private static String key(String robotId) {
        return KEY_PATTERN.formatted(robotId);
    }
}
