package com.example.robotops.domain.service;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.domain.entity.MissionCurrent;
import com.example.robotops.domain.entity.MissionHistoryLog;
import com.example.robotops.domain.repository.MissionCurrentRepository;
import com.example.robotops.domain.repository.MissionHistoryLogRepository;
import com.example.robotops.global.errorMessage.StringEnum;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MissionService {

    private final MissionCurrentRepository missionCurrentRepository;
    private final MissionHistoryLogRepository missionHistoryLogRepository;
    private final KafkaProducer kafkaProducer;

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

        current.changeMission(newMission);

        missionHistoryLogRepository.save(MissionHistoryLog.of(current, oldMission, newMission));

        if (oldMission != Mission.DONE && newMission == Mission.DONE) {
            kafkaProducer.countDone(deviceId);
            kafkaProducer.sendThroughput(deviceId);
        }
    }

}
