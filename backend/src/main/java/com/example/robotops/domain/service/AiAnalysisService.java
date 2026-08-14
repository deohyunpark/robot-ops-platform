package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.AiAnalysis;
import com.example.robotops.domain.repository.AiAnalysisRepository;
import com.example.robotops.domain.request.AiAnalysisRequest;
import com.example.robotops.domain.response.AiAnalysisResponse;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import io.micrometer.core.instrument.Timer;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiAnalysisService {

    private final AiAnalysisRepository aiAnalysisRepository;
    private final RobotOpsGrafanaMetrics metrics;

    @Transactional
    public void saveAiAnalysis(AiAnalysisRequest aiaAnalysisRequest) {
        AiAnalysis from = AiAnalysis.from(
                aiaAnalysisRequest.insightFeedResponse(),
                aiaAnalysisRequest.aiSummaryResponse()
        );
        aiAnalysisRepository.save(from);
    }

    public List<AiAnalysisResponse> getRecentAiAnalysis() {
        Timer.Sample sample = metrics.startInsightFeedApi();
        try {
            List<AiAnalysisResponse> rows = aiAnalysisRepository.findRecentAiAnalysis();
            metrics.stopInsightFeedApi(sample, "success");
            return rows;
        } catch (RuntimeException ex) {
            metrics.stopInsightFeedApi(sample, "error");
            throw ex;
        }
    }
}
