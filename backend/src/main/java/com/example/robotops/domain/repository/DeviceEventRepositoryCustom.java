package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.DeviceEvent;
import java.util.List;

public interface DeviceEventRepositoryCustom {

    void batchInsert(List<DeviceEvent> deviceEvents);
}
