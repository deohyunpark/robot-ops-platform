package com.example.robotops.domain.service.eventrule;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import java.util.Optional;
import java.util.function.Function;

public class EventHandler {

    private final Function<EventContext, Boolean> rule;
    private final EventType eventType;
    private final Severity severity;
    private final PayloadType payloadType;

    public EventHandler(
            Function<EventContext, Boolean> rule,
            EventType eventType,
            Severity severity,
            PayloadType payloadType
    ) {
        this.rule = rule;
        this.eventType = eventType;
        this.severity = severity;
        this.payloadType = payloadType;
    }

    // todo : 컬럼 추가 : current event
    public Optional<DeviceEvent> evaluate(EventContext ctx) {
        if (rule.apply(ctx)) {
            return Optional.of(
                    DeviceEvent.of(
                            ctx.tp().robotId(),
                            eventType,
                            severity,
                            payloadType.toMap(ctx.tp())
                    )
            );
        }
        return Optional.empty();
    }
}
