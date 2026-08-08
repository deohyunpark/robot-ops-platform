package com.example.robotops.domain.repository;

import com.example.robotops.domain.response.AiAnalysisResponse;
import java.util.List;

public interface AiAnalysisRepositoryCustom {

    List<AiAnalysisResponse> findRecentAiAnalysis();
}
