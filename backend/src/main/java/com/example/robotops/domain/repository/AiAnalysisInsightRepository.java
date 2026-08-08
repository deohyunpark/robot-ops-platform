package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.AiAnalysisInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiAnalysisInsightRepository extends JpaRepository<AiAnalysisInsight, Long> {

}
