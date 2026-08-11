package com.example.robotops.domain.entity;

import com.example.robotops.domain.enums.EventStatus;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@ToString
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
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

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private EventStatus eventStatus = EventStatus.OPEN;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payload;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    private OffsetDateTime resolvedAt;

    @JsonIgnore
    @OneToOne(
            mappedBy = "deviceEvent",
            fetch = FetchType.LAZY
    )
    private EventAction eventAction;


    public static DeviceEvent of(String deviceId, EventType eventType, Severity severity, Map<String, Object> payload) {
        return DeviceEvent.builder()
                .deviceId(deviceId)
                .eventType(eventType)
                .severity(severity)
                .payload(payload)
                .build();
    }

    public void acknowledged() {
        if (eventStatus != EventStatus.OPEN) {
            throw new RobotOpsException(
                    ErrorCode.INVALID_EVENT_STATUS
            );
        }

        this.eventStatus = EventStatus.ACKNOWLEDGED;
    }

    public void resolve() {
        if (eventStatus != EventStatus.ACKNOWLEDGED) {
            throw new RobotOpsException(
                    ErrorCode.INVALID_EVENT_STATUS
            );
        }

        this.eventStatus = EventStatus.RESOLVED;
        this.resolvedAt = OffsetDateTime.now();
    }

    @JsonIgnore
    public List<ActionChecklistItem> getActionChecklistItem() {
        return this.eventAction.getActionCheckList().getItems();
    }
}
