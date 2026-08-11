package com.example.robotops.domain.enums;

import com.example.robotops.global.errorMessage.StringEnum;

public enum EventType implements StringEnum {

    OFFLINE,
    LOW_BATTERY,
    OVERHEAT,
    EMERGENCY_STOP,
    COLLISION,
    OBSTACLE,
    IDLE,
    CHARGING,
    ERROR,
    CPU_RISING,
    TEMP_RISING,
    SPEED_RISING,
}
