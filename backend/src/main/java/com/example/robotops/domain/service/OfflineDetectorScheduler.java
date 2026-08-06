package com.example.robotops.domain.service;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OfflineDetectorScheduler {

    private static final long TIMEOUT = 60 * 1000 * 5; // 5분
    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;

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
        Set<String> offlineDevices = redisService.getOfflineDeviceList(threshold);

        if (offlineDevices == null || offlineDevices.isEmpty()) {
            return;
        }

        for (String deviceId : offlineDevices) {

            log.warn("[OFFLINE] device={}", deviceId);

            Double lastSeen = redisService.getHeartbeat(deviceId);

            DeviceEvent deviceEvent = DeviceEvent.of(
                    deviceId,
                    EventType.OFFLINE,
                    Severity.CRITICAL,
                    Map.of("lastSeen", lastSeen,
                            "now", now));

            boolean success = kafkaProducer.sendDeviceEvent(deviceEvent);

            // 3. 중복 방지
            if (success) {
                redisService.deleteOfflineDevice(deviceId);
                kafkaProducer.sendOfflineList(deviceId);
            }
        }
    }
}