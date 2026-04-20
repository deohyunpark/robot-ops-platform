package com.example.robotops.application.telemetry.event;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.service.EventService;
import com.example.robotops.infra.redis.JsonUtil;
import io.micrometer.observation.Observation.Event;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OfflineDetectorScheduler {

    private final StringRedisTemplate redisTemplate;
    private final EventService eventService;
    private final JsonUtil jsonUtil;

    private static final String KEY = "device:lastSeen:zset";
    private static final long TIMEOUT = 10 * 1000; // 10초
    /**
     * 시뮬레이터 기준 타임아웃 잡는게 오래걸려서 임시로 10초
     * todo : 테스트 후 시뮬레이터를 수정(타임아웃 길게 유지)
    */

    @Scheduled(fixedRate = 2000) // 2초마다 체크
    public void detectOffline() {

        long now = System.currentTimeMillis();
        long threshold = now - TIMEOUT;


        log.info("[SCHEDULER] detectOffline running");

        // 1. OFFLINE 대상 조회
        Set<String> offlineDevices =
                redisTemplate.opsForZSet()
                        .rangeByScore(KEY, 0, threshold);

        if (offlineDevices == null || offlineDevices.isEmpty()) {
            return;
        }

        for (String deviceId : offlineDevices) {

            log.warn("[OFFLINE] device={}", deviceId);

            Double lastSeen = redisTemplate.opsForZSet()
                    .score(KEY, deviceId);

            Map.of("lastSeen", lastSeen,
                    "now", System.currentTimeMillis());
            // 2. 이벤트 생성
            eventService.emit(
                    DeviceEvent.of(
                            deviceId,
                            EventType.OFFLINE,
                            Severity.CRITICAL,
                            Map.of("lastSeen", lastSeen,
                                    "now", System.currentTimeMillis()))

                    );

            // 3. 중복 방지 (중요)
            redisTemplate.opsForZSet()
                    .remove(KEY, deviceId);
        }
    }
}