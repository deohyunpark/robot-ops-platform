package com.example.robotops.domain.response.eventpayload;

import static com.example.robotops.domain.response.eventpayload.PayloadField.BATTERY;
import static com.example.robotops.domain.response.eventpayload.PayloadField.BUMPER;
import static com.example.robotops.domain.response.eventpayload.PayloadField.CPU;
import static com.example.robotops.domain.response.eventpayload.PayloadField.ERRORS;
import static com.example.robotops.domain.response.eventpayload.PayloadField.ESTOP;
import static com.example.robotops.domain.response.eventpayload.PayloadField.MAP_ID;
import static com.example.robotops.domain.response.eventpayload.PayloadField.MEM;
import static com.example.robotops.domain.response.eventpayload.PayloadField.MISSION;
import static com.example.robotops.domain.response.eventpayload.PayloadField.MODE;
import static com.example.robotops.domain.response.eventpayload.PayloadField.OBSTACLE;
import static com.example.robotops.domain.response.eventpayload.PayloadField.ONLINE;
import static com.example.robotops.domain.response.eventpayload.PayloadField.ROBOT_ID;
import static com.example.robotops.domain.response.eventpayload.PayloadField.SEQ;
import static com.example.robotops.domain.response.eventpayload.PayloadField.SPEED;
import static com.example.robotops.domain.response.eventpayload.PayloadField.TEMP;
import static com.example.robotops.domain.response.eventpayload.PayloadField.THETA;
import static com.example.robotops.domain.response.eventpayload.PayloadField.TS;
import static com.example.robotops.domain.response.eventpayload.PayloadField.X;
import static com.example.robotops.domain.response.eventpayload.PayloadField.Y;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

public enum PayloadType {

    OFFLINE(
            TS, ROBOT_ID, SEQ,
            ONLINE, BATTERY, MODE, MISSION,
            X, Y, MAP_ID
    ),

    LOW_BATTERY(
            TS, ROBOT_ID, SEQ,
            BATTERY, MODE, MISSION,
            X, Y
    ),

    OVERHEAT(
            TS, ROBOT_ID, SEQ,
            TEMP, CPU, MEM,
            MODE, MISSION
    ),

    COLLISION(
            TS, ROBOT_ID, SEQ,
            BUMPER, SPEED,
            X, Y, THETA, MAP_ID
    ),

    OBSTACLE_DETECTED(
            TS, ROBOT_ID, SEQ,
            OBSTACLE, SPEED,
            X, Y
    ),

    EMERGENCY_STOP(
            TS, ROBOT_ID, SEQ,
            ESTOP, SPEED,
            MODE, MISSION,
            X, Y
    ),

    ERROR(
            TS, ROBOT_ID, SEQ,
            ERRORS
    ),

    IDLE(
            TS, ROBOT_ID, SEQ, MODE, MISSION,
            X, Y, MAP_ID, BATTERY, SPEED
    ),
    CHARGING(
            TS, ROBOT_ID, SEQ, MODE, MISSION, BATTERY,
            SPEED, X, Y, MAP_ID
    ),
    ;

    private final PayloadField[] fields;

    PayloadType(PayloadField... fields) {
        this.fields = fields;
    }

    public PayloadField[] fields() {
        return fields;
    }

    public Map<String, Object> toMap(TelemetryPayload telemetryPayload) {
        return Arrays.stream(fields)
                .collect(
                        Collectors.toMap(
                                PayloadField::key,
                                payloadField -> payloadField.value(telemetryPayload)
                        )
                );
    }
}
