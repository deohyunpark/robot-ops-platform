package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.response.DeviceRiskResponse;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.service.event.EventContext;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InsightAnalyzer {

    private final InsightEngine insightEngine;
    private final RiskCalculator riskCalculator;


    // todo : 이거 id별로 나오는지.. 나오는것같긴함..
    public InsightFeedResponse analyze(EventContext eventContext) {

        // engine 에서 만든 request 리스트 추출
        List<DeviceInsightResponse> requests = insightEngine.process(eventContext);

        Integer calculated = riskCalculator.calculate(requests);
        // 생성된 DeviceInsight List kafka

        return InsightFeedResponse.of(requests, DeviceRiskResponse.from(calculated));
        // todo: InsightHandler 에서 온 DeviceInsight 를 계산 후 Insight Publisher Insight DB 저장, Redis 저장, Websocket 발행
        // 웹소켓은 합쳐ㅓ 발행 -? gpt한테


    }

}
