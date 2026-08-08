package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.AiAnalysis;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long>, AiAnalysisRepositoryCustom {
    Optional<AiAnalysis> findTopByRobotIdOrderByCreatedAtDesc(String robotId);

}
