package com.example.robotops.domain.service.event;

import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import com.example.robotops.domain.service.RuleHandler;
import java.util.function.Function;

public class EventHandler extends RuleHandler<DeviceEvent>{

    private final EventType eventType;
    private final Severity severity;
    private final PayloadType payloadType;


    public EventHandler(
            Function<EventContext, Boolean> rule,
            EventType eventType,
            Severity severity,
            PayloadType payloadType
    ) {
        super(rule);
        this.eventType = eventType;
        this.severity = severity;
        this.payloadType = payloadType;
    }

    // todo : 컬럼 추가 : current event
    @Override
    public DeviceEvent create(EventContext ctx) {
        return
                DeviceEvent.of(
                        ctx.tp().robotId(),
                        eventType,
                        severity,
                        payloadType.toMap(ctx.tp())

        );
    }

}
