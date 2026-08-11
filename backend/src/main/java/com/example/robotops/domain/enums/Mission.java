package com.example.robotops.domain.enums;

import com.example.robotops.global.errorMessage.StringEnum;

public enum Mission implements StringEnum {
    IDLE,
    PICK,
    PACK,
    MOVE,
    CHARGE,
    DONE,
    UNKNOWN
}
