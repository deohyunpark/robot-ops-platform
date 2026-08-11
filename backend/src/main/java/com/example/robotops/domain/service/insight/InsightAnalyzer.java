package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.response.DeviceRiskResponse;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.service.event.EventContext;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InsightAnalyzer {

    private final InsightEngine insightEngine;
    private final RiskCalculator riskCalculator;



    public InsightFeedResponse analyze(EventContext eventContext) {

        // engine 에서 만든 request 리스트 추출
        List<DeviceInsightResponse> requests = insightEngine.process(eventContext)
                .stream().filter(Objects::nonNull).toList();

        if (requests.isEmpty()) {
            return null;
        }

        Integer calculated = riskCalculator.calculate(requests);
        // 생성된 AiAnalysis List kafka

        return InsightFeedResponse.of(eventContext.tp().robotId(), requests, DeviceRiskResponse.from(calculated));


    }

}
