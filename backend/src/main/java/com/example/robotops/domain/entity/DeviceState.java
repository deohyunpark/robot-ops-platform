package com.example.robotops.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "device_state",
        indexes = {
                    @Index(
                            name = "idx_device_state_seen",
                            columnList = "last_seen_at"
                    )
            }
    )
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeviceState {

    @EmbeddedId
    private DeviceStateId id;

    @Column(name = "site_id", nullable = false, length = 100)
    private String siteId;

    @Column(name = "online")
    private Boolean online;

    @Column(name = "mode", length = 30)
    private String mode;

    @Column(name = "mission", length = 50)
    private String mission;

    @Column(name = "battery_pct")
    private Double batteryPct;

    @Column(name = "speed_mps")
    private Double speedMps;

    @Column(name = "pos_x")
    private Double posX;

    @Column(name = "pos_y")
    private Double posY;

    @Column(name = "theta")
    private Double theta;

    @Column(name = "map_id", length = 100)
    private String mapId;

    @Column(name = "cpu_pct")
    private Double cpuPct;

    @Column(name = "mem_pct")
    private Double memPct;

    @Column(name = "temp_c")
    private Double tempC;

    // 비상정지버튼 눌림 여부
    @Column(name = "estop")
    private Boolean estop;

    // 충돌 여부
    @Column(name = "bumper")
    private Boolean bumper;

    // 장애물 감지 여부
    @Column(name = "obstacle")
    private Boolean obstacle;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "last_seq", nullable = false)
    private Long lastSeq;

    // 마지막 telemetry 수신 시각
    @Column(name = "last_seen_at", nullable = false)
    private OffsetDateTime lastSeenAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public boolean isDisconnected() {
        return lastSeenAt == null ||
                lastSeenAt.isBefore(
                        OffsetDateTime.now().minusSeconds(5)
                );
    }

    public boolean isEmergency() {
        return Boolean.TRUE.equals(estop)
                || Boolean.TRUE.equals(bumper)
                || Boolean.TRUE.equals(obstacle);
    }

    public boolean isIdle() {
        return "IDLE".equalsIgnoreCase(mission);
    }

    public boolean isLowBattery(Double batteryPct) {
        return batteryPct != null && batteryPct < 20;
    }

    public boolean isOverheated(Double tempC) {
        return tempC != null && tempC >= 80;
    }

    public boolean isCharging() {
        return "CHARGE".equalsIgnoreCase(mission);
    }
}
