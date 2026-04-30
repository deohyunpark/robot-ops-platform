package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.MissionHistoryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MissionHistoryLogRepository extends JpaRepository<MissionHistoryLog, Long> {
}
