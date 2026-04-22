package com.example.robotops.domain.response.eventpayload;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import java.util.function.Function;

public enum PayloadField {

        TS("ts", TelemetryPayload::ts),
        ROBOT_ID("robotId", TelemetryPayload::robotId),
        SEQ("seq", TelemetryPayload::seq),

        ONLINE("online", tp -> tp.state().online()),
        MODE("mode", tp -> tp.state().mode()),
        MISSION("mission", tp -> tp.state().mission()),
        BATTERY("batteryPct", tp -> tp.state().batteryPct()),
        SPEED("speedMps", tp -> tp.state().speedMps()),

        X("x", tp -> tp.pose().x()),
        Y("y", tp -> tp.pose().y()),
        THETA("theta", tp -> tp.pose().theta()),
        MAP_ID("mapId", tp -> tp.pose().mapId()),

        CPU("cpuPct", tp -> tp.health().cpuPct()),
        MEM("memPct", tp -> tp.health().memPct()),
        TEMP("tempC", tp -> tp.health().tempC()),

        ESTOP("estop", tp -> tp.safety().estop()),
        BUMPER("bumper", tp -> tp.safety().bumper()),
        OBSTACLE("obstacle", tp -> tp.safety().obstacle()),

        // todo : 본질적인 구조개선
        ERRORS("errors", TelemetryPayload::errors);

        private final String key;
        private final Function<TelemetryPayload, Object> extractor;

        PayloadField(String key, Function<TelemetryPayload, Object> extractor) {
                this.key = key;
                this.extractor = extractor;
        }

        public String key() {
                return key;
        }

        public Object value(TelemetryPayload tp) {
                return extractor.apply(tp);
        }

}
