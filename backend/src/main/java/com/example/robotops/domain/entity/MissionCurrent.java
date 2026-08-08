package com.example.robotops.domain.entity;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.global.errorMessage.StringEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "mission_current")
@Entity
public class MissionCurrent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id")
    private String deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mission", length = 50)
    private Mission mission;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public static MissionCurrent from(TelemetryPayload telemetryPayload) {
        return MissionCurrent.builder()
                .deviceId(telemetryPayload.robotId())
                .mission(StringEnum.from(Mission.class, telemetryPayload.state().mode()))
                .build();
    }

    public void changeMission(Mission mission) {
        this.mission = mission;
        this.completedAt = OffsetDateTime.now();
    }

}

