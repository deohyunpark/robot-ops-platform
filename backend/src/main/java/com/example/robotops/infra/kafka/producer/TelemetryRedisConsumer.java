package com.example.robotops.infra.kafka.producer;

import com.example.robotops.domain.request.DeviceStateRequest;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryRedisConsumer {

    private final RedisService redisService;
    private final JsonUtil jsonUtil;

    @KafkaListener(topics = "robot.device.state", groupId = "redis-group")
    public void consume(String message) {

        DeviceStateRequest deviceStateRequest = jsonUtil.fromJson(message, DeviceStateRequest.class);

        redisService.saveState(deviceStateRequest);
        log.info("[Redis] device state/lastSeen saved = {}", deviceStateRequest.deviceId());

        redisService.updateHeartbeat(deviceStateRequest.deviceId());

        // todo : 엥
        // 지속성
        redisService.updateMetric(deviceStateRequest.deviceId(), "temp", deviceStateRequest.tempC());
        redisService.updateMetric(deviceStateRequest.deviceId(), "cpu", deviceStateRequest.cpuPct());

        // 변화값
        redisService.updateWindow(deviceStateRequest.deviceId(), "battery", deviceStateRequest.batteryPct());
        redisService.updateWindow(deviceStateRequest.deviceId(), "speed", deviceStateRequest.speedMps());
        log.info("[Redis] device heartbeat updated = {}", deviceStateRequest.deviceId());
    }
}
