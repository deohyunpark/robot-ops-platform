package com.example.robotops.domain.repository;

import com.example.robotops.domain.entity.AiAnalysis;
import com.example.robotops.domain.response.AiAnalysisResponse;
import java.util.List;
import java.util.Optional;

public interface AiAnalysisRepositoryCustom {

    List<AiAnalysisResponse> findRecentAiAnalysis();

    Optional<AiAnalysis> findHighestPriorityAiAnalysis(String deviceId);
}
