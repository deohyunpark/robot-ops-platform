package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.MissionCurrent;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissionCurrentRepository extends JpaRepository<MissionCurrent, Long> {

    Optional<MissionCurrent> findByDeviceId(String deviceId);
}
