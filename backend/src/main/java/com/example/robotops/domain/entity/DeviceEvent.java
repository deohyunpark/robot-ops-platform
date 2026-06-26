package com.example.robotops.domain.entity;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.domain.deviceStateType.Severity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "device_event")
@Entity
public class DeviceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false)
    private String deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_mission", nullable = false)
    private Mission currentMission;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payload;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    // todo : resolved 추가
    // todo : 크리티컬 -> action, warning -> 보고 분석, info -> mode 변경
    public static DeviceEvent of(String deviceId, EventType eventType, Severity severity, Map<String, Object> payload) {
        return DeviceEvent.builder()
                .deviceId(deviceId)
                .eventType(eventType)
                .severity(severity)
                .payload(payload)
                .build();
    }
}
