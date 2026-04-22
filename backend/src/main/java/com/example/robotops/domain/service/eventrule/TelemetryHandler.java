package com.example.robotops.domain.service.eventrule;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Mission;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.eventpayload.PayloadType;
import com.example.robotops.global.errorMessage.StringEnum;
import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;

public enum TelemetryHandler implements EventHandler {

    OFFLINE(
            tp -> !Boolean.TRUE.equals(tp.state().online()),
            EventType.OFFLINE,
            Severity.CRITICAL,
            PayloadType.OFFLINE
    ),

    BUMPER(
            tp -> Boolean.TRUE.equals(tp.safety().bumper()),
            EventType.COLLISION,
            Severity.CRITICAL,
            PayloadType.COLLISION
    ),

    EMERGENCY_STOP(
            tp -> Boolean.TRUE.equals(tp.safety().estop()),
            EventType.EMERGENCY_STOP,
            Severity.CRITICAL,
            PayloadType.EMERGENCY_STOP
    ),

    OBSTACLE(
            tp -> Boolean.TRUE.equals(tp.safety().obstacle()),
            EventType.OBSTACLE,
            Severity.CRITICAL,
            PayloadType.OBSTACLE_DETECTED
    ),

    OVERHEAT(
            tp -> tp.health().tempC() != null
                    && tp.health().tempC() >= 80,
            EventType.OVERHEAT,
            Severity.CRITICAL,
            PayloadType.OVERHEAT
    ),

    LOW_BATTERY(
            tp -> tp.state().batteryPct() != null
                    && tp.state().batteryPct() < 20,
            EventType.LOW_BATTERY,
            Severity.WARNING,
            PayloadType.LOW_BATTERY
    ),




    IDLE(
            tp -> StringEnum.from(Mission.class, tp.state().mission()) == Mission.IDLE,
            EventType.IDLE,
            Severity.INFO,
            PayloadType.IDLE
    ),

    CHARGING(
            tp -> StringEnum.from(Mission.class, tp.state().mission()) == Mission.CHARGE,
            EventType.CHARGING,
            Severity.INFO,
            PayloadType.CHARGING
    );

    private final Predicate<TelemetryPayload> rule;
    private final EventType eventType;
    private final Severity severity;
    private final PayloadType payloadType;

    TelemetryHandler(Predicate<TelemetryPayload> rule, EventType eventType, Severity severity, PayloadType payloadType) {
        this.rule = rule;
        this.severity = severity;
        this.eventType = eventType;
        this.payloadType = payloadType;
    }

    public static List<DeviceEvent> evaluateAll(TelemetryPayload tp) {
        return Arrays.stream(values())
                .parallel()
                .flatMap(h -> h.evaluate(tp).stream())
                .toList();
    }

    public boolean matches(TelemetryPayload tp) {
        return rule.test(tp);
    }

    /**
     * 나는 뭘 만들고 싶은건가
     * mqtt 가 오면 알아서 객체 만들어서 병럴처리
     * 이벤트는 두가지
     * mqtt 받고 즉시 실행
     * redis 받고 조건확인 후 실해ㅔㅇ
     *
    */

    // todo: 하 뭔가 이상함 내생각대로안나올듯
    // todo : 일단 이벤트먼저
    // todo : 그다음 save , ws
    // todo : 카프카 이상하게쓰고있는것같음 구조분리하고 테스트
    // 에러코드

    @Override
    public List<DeviceEvent> evaluate(TelemetryPayload telemetryPayload) {
        if (rule.test(telemetryPayload)) {
            return List.of(
                    DeviceEvent.of(
                            telemetryPayload.robotId(),
                            this.eventType,
                            this.severity,
                            this.payloadType.toMap(telemetryPayload)
                    )
            );
        }

        return List.of();
    }
}
