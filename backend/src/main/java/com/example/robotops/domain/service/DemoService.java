package com.example.robotops.domain.service;

import com.example.robotops.domain.repository.ActionCheckListItemRepository;
import com.example.robotops.domain.repository.ActionCheckListRepository;
import com.example.robotops.domain.repository.AiAnalysisInsightRepository;
import com.example.robotops.domain.repository.AiAnalysisRepository;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.repository.EventActionRepository;
import com.example.robotops.domain.response.DemoSessionResponse;
import com.example.robotops.domain.response.DemoStatusResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DemoService {


    private static final String DEMO_STATUS_KEY =
            "demo:simulation:status";

    private static final String DEMO_EXPIRE_KEY =
            "demo:simulation:expiresAt";


    private final StringRedisTemplate redisTemplate;
    private final DeviceEventRepository deviceEventRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final DeviceStateRepository deviceStateRepository;
    private final AiAnalysisInsightRepository aiAnalysisInsightRepository;
    private final EventActionRepository eventActionRepository;
    private final ActionCheckListRepository actionCheckListRepository;
    private final ActionCheckListItemRepository actionCheckListItemRepository;

    public DemoSessionResponse start(Duration duration) {
        Instant expiresAt = Instant.now().plus(duration);

        redisTemplate.opsForValue().set(
                DEMO_STATUS_KEY,
                "RUNNING",
                duration
        );

        redisTemplate.opsForValue().set(
                DEMO_EXPIRE_KEY,
                expiresAt.toString(),
                duration
        );

        return new DemoSessionResponse(
                "RUNNING",
                expiresAt
        );
    }

    @Transactional
    public void stop() {

        // 1. 시뮬레이터 정지
        redisTemplate.delete(DEMO_STATUS_KEY);

        // 2. Redis 실시간 데이터 초기화
        clearRedis();

        // 3. DB 데모 데이터 초기화
        clearDatabase();
    }

    private void clearRedis() {

        redisTemplate.delete("device:lastSeen:zset");

        Set<String> keys =
                redisTemplate.keys("device:*");

        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }

        Set<String> utilizationKeys =
                redisTemplate.keys("utilization:*");

        if (utilizationKeys != null && !utilizationKeys.isEmpty()) {
            redisTemplate.delete(utilizationKeys);
        }

        Set<String> throughputKeys =
                redisTemplate.keys("throughput:*");

        if (throughputKeys != null && !throughputKeys.isEmpty()) {
            redisTemplate.delete(throughputKeys);
        }

        Set<String> coolDownAndPendingKeys =
                redisTemplate.keys("ai:*");

        if(coolDownAndPendingKeys != null && !coolDownAndPendingKeys.isEmpty()) {
            redisTemplate.delete(coolDownAndPendingKeys);
        }
    }

    private void clearDatabase() {
        aiAnalysisInsightRepository.deleteAllInBatch();
        aiAnalysisRepository.deleteAllInBatch();
        actionCheckListItemRepository.deleteAllInBatch();
        actionCheckListRepository.deleteAllInBatch();
        eventActionRepository.deleteAllInBatch();
        deviceEventRepository.deleteAllInBatch();
        deviceStateRepository.deleteAllInBatch();
    }

    public DemoStatusResponse getStatus() {
        String status =
                redisTemplate.opsForValue()
                        .get("demo:simulation:status");

        Long ttl =
                redisTemplate.getExpire(
                        "demo:simulation:status",
                        TimeUnit.SECONDS
                );

        if (
                status == null
                        || ttl == null
                        || ttl <= 0
        ) {
            return new DemoStatusResponse(
                    "STOPPED",
                    0
            );
        }

        return new DemoStatusResponse(
                status,
                ttl
        );
    }
}
