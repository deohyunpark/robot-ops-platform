package com.example.robotops.domain.service;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.deviceStateType.Severity;
import com.example.robotops.domain.entity.DeviceEvent;
import java.util.Map;
import java.util.Optional;

public enum EventTypeHandler {

    OFFLINE(Severity.CRITICAL, M) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (!Boolean.TRUE.equals(tp.state().online())) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.OFFLINE,
                                this.severity,
                                Map.of("device online", tp.state().online())
                        )
                );
            }
            return Optional.empty();
        }
    },
    ONLINE(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            return Optional.empty();
        }
    },

    LOW_BATTERY(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (tp.state().batteryPct() != null && tp.state().batteryPct() < 20) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.LOW_BATTERY,
                                Severity.CRITICAL,
                                Map.of("low battery", tp.state().batteryPct())
                        )
                );
            }
            return Optional.empty();
        }
    },


    EMERGENCY_STOP(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (Boolean.TRUE.equals(tp.safety().estop())) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.EMERGENCY_STOP,
                                Severity.CRITICAL,
                                Map.of("emergency stop", tp.safety().estop())
                        )
                );
            }
            return Optional.empty();
        }
    },
    COLLISION(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (Boolean.TRUE.equals(tp.safety().bumper())) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.COLLISION,
                                Severity.CRITICAL,
                                Map.of("bumper collision", tp.safety().bumper())
                        )
                );
            }
            return Optional.empty();
        }
    },
    OBSTACLE(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (Boolean.TRUE.equals(tp.safety().obstacle())) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.OBSTACLE,
                                Severity.CRITICAL,
                                Map.of("obstacle", tp.safety().obstacle())
                        )
                );
            }
            return Optional.empty();
        }
    },

    ERROR(Severity.CRITICAL) {
        @Override
        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
            if (!tp.errors().isEmpty()) {
                return Optional.of(
                        DeviceEvent.of(
                                tp.robotId(),
                                EventType.ERROR,
                                Severity.CRITICAL,
                                // todo
                                (Map<String, Object>) tp.errors())
                        );
            }
            return Optional.empty();
        }
    },

    //    CRITICAL_BATTERY {
//        @Override
//        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
//            return Optional.empty();
//        }
//    },
//
//    HIGH_CPU {
//        @Override
//        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
//            return Optional.empty();
//        }
//    },
//    OVERHEAT {
//        @Override
//        public Optional<DeviceEvent> evaluate(TelemetryPayload tp) {
//            return Optional.empty();
//        }
//    },
    ;


    public final Severity severity;
    private final Map<String, Object> payload;

    EventTypeHandler(Severity severity) {
        this.severity = severity;
    }

    public abstract Optional<DeviceEvent> evaluate(TelemetryPayload tp);

    //todo : payload 고치기
    /**
     * 1. 페이로드 고치긷
     * 1-1. predication 인가 이거 써보기
     * 2. 이벤트 타입 제대로 설계
     * 3. 엔진으로 묶기?
    */
}
