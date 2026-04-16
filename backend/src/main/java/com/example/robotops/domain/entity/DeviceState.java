package com.example.robotops.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name ="device_state")
@Entity
public class DeviceState {

    @EmbeddedId
    private DeviceStateId id;

    @Column(name = "site_id")
    private String siteId;

    private Boolean online;
    private String mode;
    private String mission;

    @Column(name = "battery_pct")
    private Double batteryPct;

    @Column(name = "speed_mps")
    private Double speedMps;

    @Column(name = "pos_x")
    private Double posX;

    @Column(name = "pos_y")
    private Double posY;

    // 회전값(degree)
    @Column(name = "theta")
    private Double theta;

    @Column(name = "map_id")
    private String mapId;

    /** 장비 헬스 영역 */
    @Column(name = "cpu_pct")
    private Double cpuPct;

    @Column(name = "mem_pct")
    private Double memPct;

    @Column(name = "temp_c")
    private Double tempC;

    /** 안전 상태 영역 */
    private Boolean estop;
    // 비상정지 버튼 눌림 여부
    private Boolean bumper;
    // 충돌 감지 여부
    private Boolean obstacle;
    // 장애물 감지 여부

    // 마지막 메세지 순번
    @Column(name = "last_seq")
    private Long lastSeq;

    // 마지막 telemetry 수신 시각
    @Column(name = "last_seen_at")
    private OffsetDateTime lastSeenAt;

    public boolean isDisconnected() {
        return lastSeenAt == null ||
                lastSeenAt.isBefore(
                        OffsetDateTime.now().minusSeconds(5)
                );
    }

    public boolean isLowBattery() {
        return batteryPct != null && batteryPct < 20;
    }

    public boolean isOverheated() {
        return tempC != null && tempC >= 80;
    }

    public boolean isEmergency() {
        return Boolean.TRUE.equals(estop)
                || Boolean.TRUE.equals(bumper)
                || Boolean.TRUE.equals(obstacle);
    }

    public boolean isIdle() {
        return "IDLE".equalsIgnoreCase(mission);
    }

    public boolean isCharging() {
        return "CHARGE".equalsIgnoreCase(mission);
    }
}
