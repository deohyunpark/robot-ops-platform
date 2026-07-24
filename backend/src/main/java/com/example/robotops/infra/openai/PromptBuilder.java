package com.example.robotops.infra.openai;

import com.example.robotops.domain.response.InsightFeedResponse;
import org.springframework.stereotype.Component;

@Component
public class PromptBuilder {


    public String build(InsightFeedResponse response) {
        return
                """
                 감지된 이상:
                 %s
                 
                 위험도:
                 %s
                 """.formatted(
                         response.insightResponses(),
                         response.riskResponse()
                );
    }
}
