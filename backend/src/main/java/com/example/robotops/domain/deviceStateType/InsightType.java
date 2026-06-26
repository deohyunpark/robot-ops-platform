package com.example.robotops.domain.deviceStateType;

import com.example.robotops.global.errorMessage.StringEnum;

public enum InsightType implements StringEnum {

    OVERHEAT("과열 위험", "냉각팬 점검"),
    LOW_BATTERY("배터리 부족", "충전소 이동");

    private final String title;
    private final String recommendation;

    InsightType(String title, String recommendation) {
        this.title = title;
        this.recommendation = recommendation;
    }

    public String getTitle() {
        return title;
    }

    public String getRecommendation() {
        return recommendation;
    }


}
