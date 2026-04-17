package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.DeviceState;
import com.example.robotops.domain.entity.DeviceStateId;
import org.springframework.data.jpa.repository.JpaRepository;


public interface DeviceStateRepository extends JpaRepository<DeviceState, DeviceStateId> {
}
