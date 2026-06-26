package com.example.robotops.domain.deviceStateType;

import com.example.robotops.global.errorMessage.StringEnum;

public enum EventType implements StringEnum {

    OFFLINE,
    ONLINE,

    LOW_BATTERY,
    CRITICAL_BATTERY,

    HIGH_CPU,
    OVERHEAT,

    EMERGENCY_STOP,
    COLLISION,
    OBSTACLE,

    IDLE,
    CHARGING,

    ERROR,

    BATTERY_RISING,
    BATTERY_FALLING,

    CPU_RISING,
    CPU_FALLING,

    TEMP_RISING,
    TEMP_FALLING,

    SPEED_RISING,
    SPEED_FALLING,

    BATTERY_RAPID_RISE,
    CPU_RAPID_RISE,
    TEMP_RAPID_RISE,

    BATTERY_RAPID_DROP,
    CPU_RAPID_DROP,
    TEMP_RAPID_DROP,

    BATTERY_SUSTAINED_UP,
    CPU_SUSTAINED_UP,
    TEMP_SUSTAINED_UP
}
