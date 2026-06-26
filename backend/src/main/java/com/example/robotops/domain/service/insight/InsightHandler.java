package com.example.robotops.domain.service.insight;

import com.example.robotops.domain.deviceStateType.InsightLevel;
import com.example.robotops.domain.deviceStateType.InsightType;
import com.example.robotops.domain.request.DeviceInsightRequest;
import com.example.robotops.domain.service.RuleHandler;
import com.example.robotops.domain.service.event.EventContext;
import java.util.function.Function;

public class InsightHandler extends RuleHandler<DeviceInsightRequest> {


    // todo : RiskCalculator 실행
    /**
     * 룰은 이미 만들어짐 realtime, stateful
     * EventContext 네이밍 변경 후 활용
     * RiskCalculator 에서 score 계산
     *
     * MQTT가 EventHandler 를 return -> 네이밍 변경? or 추상 클래스?
     * 네이밍 변경 -> 재탕가능한데 분리가 안됨
     * 추상 클래스 -> 상속받아 사용하되 Registry 재등록? 일단 handler 추상화
     */

    private final InsightLevel insightLevel;
    private final InsightType insightType;
    private final RiskCalculator riskCalculator;

    public InsightHandler(
            Function<EventContext, Boolean> rule,
            InsightLevel insightLevel,
            InsightType insightType, RiskCalculator riskCalculator
    ) {
        super(rule);
        this.insightLevel = insightLevel;
        this.insightType = insightType;
        this.riskCalculator = riskCalculator;
    }

    @Override
    protected DeviceInsightRequest create(EventContext ctx) {
        return DeviceInsightRequest.of(
                ctx.tp().robotId(),
                insightLevel,
                insightType.getTitle(),
                insightType.getRecommendation()
        );
    }




}
