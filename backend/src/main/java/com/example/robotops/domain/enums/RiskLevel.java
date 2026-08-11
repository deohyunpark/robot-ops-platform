package com.example.robotops.domain.enums;

import com.example.robotops.global.errorMessage.StringEnum;

public enum RiskLevel implements StringEnum {

    HIGH,
    MIDDLE,
    LOW;

    public static RiskLevel from(int score) {
        if (score >= 80) {
            return HIGH;
        }

        if (score >= 40) {
            return MIDDLE;
        }

        return LOW;
    }
}
