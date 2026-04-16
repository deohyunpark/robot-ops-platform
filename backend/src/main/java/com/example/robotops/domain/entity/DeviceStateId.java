package com.example.robotops.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

// 복합키를 위한 record
@Embeddable
public record DeviceStateId(

        // DB 매핑 명시용
        @Column(name = "device_type")
        String deviceType,
        @Column(name = "device_id")
        String deviceId

) implements Serializable {
}
