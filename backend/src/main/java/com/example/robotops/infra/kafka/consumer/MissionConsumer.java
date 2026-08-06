package com.example.robotops.infra.kafka.consumer;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.service.MissionService;
import com.example.robotops.infra.redis.JsonUtil;
import com.example.robotops.infra.redis.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MissionConsumer {

    private final JsonUtil jsonUtil;
    private final MissionService missionService;
    private final RedisService redisService;

    @KafkaListener(topics = "robot.device.mission", groupId = "db")
    public void saveDB(String message) {

        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
        missionService.processMission(telemetryPayload);

    }

    @KafkaListener(topics = "robot.device.mission", groupId = "redis-bucket")
    public void setMissionTimeAndBucketRedis(String message) {

        TelemetryPayload telemetryPayload = jsonUtil.fromJson(message, TelemetryPayload.class);
        missionService.processDuration(telemetryPayload);
    }

    @KafkaListener(topics = "robot.device.mission.done", groupId = "redis")
    public void setCountRedis(String deviceId) {
        redisService.countDone15Minutes();
        redisService.countDoneDaily();
    }
}
