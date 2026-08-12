package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.response.DeviceEventResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface DeviceEventRepositoryCustom {

    void batchInsert(List<DeviceEvent> deviceEvents);

    List<DeviceEventResponse> findDeviceByRequest(String deviceId, EventType eventType, OffsetDateTime from, OffsetDateTime to);

    List<DeviceEvent> findAllUnresolvedDeviceEvents(String deviceId);

    List<DeviceEvent> findAllDeviceEvents(String deviceId);

    boolean existsOpenCritical(String deviceId);

    Optional<OffsetDateTime> findLatestOpenEventAt(String deviceId);

    List<DeviceEventResponse> findTodayEvents(OffsetDateTime from, OffsetDateTime to);

    List<DeviceEventResponse> findOfflineEvents(OffsetDateTime from, OffsetDateTime to);

    Optional<DeviceEvent> findHighestPriorityOpenEvent(String deviceId);

    Optional<DeviceEvent> findByIdWithAction(Long eventId);

    List<DeviceEvent> findAllOpenEvents(List<String> deviceIds);
}
