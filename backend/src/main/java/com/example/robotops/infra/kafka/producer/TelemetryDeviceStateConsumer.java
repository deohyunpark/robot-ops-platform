package com.example.robotops.infra.kafka.producer;

import com.example.robotops.domain.repository.DeviceStateUpsertRepository;
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
public class TelemetryDeviceStateConsumer {

    private final DeviceStateUpsertRepository deviceStateRepository;
    private final JsonUtil jsonUtil;
    private final RedisService redisService;

    @KafkaListener(topics = "robot.device.state", groupId = "db")
    public void saveDB(String message) {

        DeviceStateRequest deviceStateRequest = jsonUtil.fromJson(message, DeviceStateRequest.class);
        deviceStateRepository.upsert(deviceStateRequest);
        log.info("[DB] device state upserted = {}", deviceStateRequest.deviceId());
    }

    @KafkaListener(topics = "robot.device.state", groupId = "redis")
    public void setRedis(String message) {

        DeviceStateRequest deviceStateRequest = jsonUtil.fromJson(message, DeviceStateRequest.class);

        redisService.saveState(deviceStateRequest);
        log.info("[Redis] device state/lastSeen saved = {}", deviceStateRequest.deviceId());

        // todo : 로그 캐싱값을 보여줄지 아님 websocket 기준으로 보여줄지
    }
}
