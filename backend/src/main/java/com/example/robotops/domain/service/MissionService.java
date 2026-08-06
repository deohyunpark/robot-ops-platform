package com.example.robotops.domain.service;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.domain.entity.MissionCurrent;
import com.example.robotops.domain.entity.MissionHistoryLog;
import com.example.robotops.domain.repository.MissionCurrentRepository;
import com.example.robotops.domain.repository.MissionHistoryLogRepository;
import com.example.robotops.global.errorMessage.StringEnum;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import java.time.Duration;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MissionService {

    private final MissionCurrentRepository missionCurrentRepository;
    private final MissionHistoryLogRepository missionHistoryLogRepository;
    private final KafkaProducer kafkaProducer;
    private final RedisService redisService;

    @Transactional
    public void processMission(TelemetryPayload telemetryPayload) {

        String deviceId = telemetryPayload.robotId();

        Mission newMission = StringEnum.from(Mission.class, telemetryPayload.state().mission());

        MissionCurrent current = missionCurrentRepository.findByDeviceId(deviceId)
                .orElseGet( () ->
                        missionCurrentRepository.save(MissionCurrent.from(telemetryPayload))
                        );

        if (current.getMission() == newMission) {
            return;
        }

        Mission oldMission = current.getMission();
        OffsetDateTime oldStartTime = current.getCompletedAt();

        current.changeMission(newMission);

        missionHistoryLogRepository.save(MissionHistoryLog.from(current, oldMission, newMission, oldStartTime));

        if (oldMission != Mission.DONE && newMission == Mission.DONE) {
            kafkaProducer.countDone(deviceId);
            kafkaProducer.sendThroughput(deviceId);
            // todo : 각 device 별 평균 처리 시간
        }
    }

    public void processDuration(TelemetryPayload telemetryPayload) {
        String deviceId = telemetryPayload.robotId();

        String prevMission = redisService.getMissionTimeValue(deviceId, "mission");
        String prevStart = redisService.getMissionTimeValue(deviceId, "startedAt");

        String newMission = telemetryPayload.state().mission();
        String newStart = telemetryPayload.ts();

        if (prevMission == null || prevStart == null) {
            redisService.updateMissionTime(deviceId, newMission, newStart);
            return;
        }

        // 상태 다를때만
        if(!prevMission.equals(newMission)) {
            OffsetDateTime now = OffsetDateTime.parse(newStart);

            long seconds = Duration.between(OffsetDateTime.parse(prevStart), now).getSeconds();

            // total 누적
            redisService.updateUtilizationBucket(deviceId, "totalSeconds", seconds);
            redisService.updateAllDevicesUtilization("totalSeconds", seconds);
            // idle, charge 제외 active 누적
            if (telemetryPayload.isActive(prevMission)) {
                redisService.updateUtilizationBucket(deviceId, "activeSeconds", seconds);
                redisService.updateAllDevicesUtilization("activeSeconds", seconds);
            }

            redisService.updateMissionTime(deviceId, newMission, newStart);
            kafkaProducer.sendTotalUtilization(deviceId);
        }

    }

}
