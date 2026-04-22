package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.DeviceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceEventRepository extends JpaRepository<DeviceEvent, Long>, DeviceEventRepositoryCustom {
}
