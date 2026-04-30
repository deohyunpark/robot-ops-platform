package com.example.robotops.domain.entity;

import com.example.robotops.domain.deviceStateType.Mission;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "mission_history_log")
@Entity
public class MissionHistoryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "device_id")
    private String deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_mission", length = 50)
    private Mission fromMission;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_mission", length = 50)
    private Mission toMission;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @CreationTimestamp
    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_current_id")
    private MissionCurrent missionCurrent;

    public static MissionHistoryLog of(MissionCurrent missionCurrent, Mission fromMission, Mission toMission) {
        return MissionHistoryLog.builder()
                .deviceId(missionCurrent.getDeviceId())
                .fromMission(fromMission)
                .toMission(toMission)
                .missionCurrent(missionCurrent)
                .build();
    }
}
