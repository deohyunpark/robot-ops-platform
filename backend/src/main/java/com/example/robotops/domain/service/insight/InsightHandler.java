package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import com.example.robotops.domain.service.RuleHandler;
import com.example.robotops.domain.service.event.EventContext;
import java.util.function.Function;


public class InsightHandler extends RuleHandler<DeviceInsightResponse> {
    /**
     * 룰은 이미 만들어짐 realtime, stateful
     * EventContext 네이밍 변경 후 활용
     * RiskCalculator 에서 score 계산
     *
     * MQTT가 EventHandler 를 return -> 네이밍 변경? or 추상 클래스?
     * 네이밍 변경 -> 재탕가능한데 분리가 안됨
     * 추상 클래스 -> 상속받아 사용하되 Registry 재등록? 일단 handler 추상화
     */

    private final String insightTitle;
    private final String insightDescription;
    private final String insightRecommendation;
    private final PayloadType payloadType;
    private final int score;

    public InsightHandler(
            Function<EventContext, Boolean> rule,
            String insightTitle,
            String insightDescription,
            String insightRecommendation,
            PayloadType payloadType,
            int score
    ) {
        super(rule);
        this.insightTitle = insightTitle;
        this.insightDescription = insightDescription;
        this.insightRecommendation = insightRecommendation;
        this.payloadType = payloadType;
        this.score = score;
    }

    @Override
    protected DeviceInsightResponse create(EventContext ctx) {
        return DeviceInsightResponse.of(
                insightTitle,
                insightDescription,
                insightRecommendation,
                payloadType.toMap(ctx.tp()),
                score
        );
    }




}
