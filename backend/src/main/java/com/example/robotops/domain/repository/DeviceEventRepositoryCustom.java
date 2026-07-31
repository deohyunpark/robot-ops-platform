package com.example.robotops.domain.repository;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.DeviceEventResponse;
import java.time.OffsetDateTime;
import java.util.List;

public interface DeviceEventRepositoryCustom {

    void batchInsert(List<DeviceEvent> deviceEvents);

    List<DeviceEventResponse> findDeviceByRequest(String deviceId, EventType eventType, OffsetDateTime from, OffsetDateTime to);
}
