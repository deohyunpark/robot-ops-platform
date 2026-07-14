package com.example.robotops.domain.deviceStateType;

import com.example.robotops.global.errorMessage.StringEnum;

public enum InsightType implements StringEnum {

    OFFLINE("오프라인", "일정 시간 동안 Heartbeat가 수신되지 않았습니다.", "네트워크 또는 전원 상태를 확인하세요.", 90),
    COLLISION("충돌 방지", "범퍼 센서가 충돌을 감지했습니다." , "주변 장애물과 기체 상태를 점검하세요.", 95),
    EMERGENCY_STOP("비상 정지", "비상 정지(E-Stop)가 활성화되었습니다." , "원인을 확인한 후 안전하게 복구하세요.", 100),
    OBSTACLE("장애물 감지", "주행 경로에 장애물이 감지되었습니다." , "경로를 확인하거나 장애물을 제거하세요.", 40),
    OVERHEAT("과열 위험", "장비 온도가 허용 범위를 초과했습니다." , "냉각 상태와 운행 환경을 확인하세요.", 80),
    LOW_BATTERY("배터리 부족", "배터리 잔량이 임계치 이하입니다. " , "충전 스테이션으로 이동하거나 충전 일정을 확인하세요.", 60),
    IDLE("장시간 대기", "로봇이 일정 시간 동안 작업 없이 대기 중입니다." , "작업 할당 상태를 확인하세요.", 10),
    CHARGING("충전 중", "로봇이 충전 스테이션에서 배터리를 충전하고 있습니다." , "충전이 완료될 때까지 현재 상태를 유지하세요.", 0),
    SPEED_RISING("속도 상승", "최근 속도가 지속적으로 증가하고 있습니다." , "운행 상태를 모니터링하세요.", 30),
    CPU_RISING("CPU 사용률 상승", "CPU 사용률이 지속적으로 증가하고 있습니다." , "시스템 부하를 확인하세요.", 45),
    TEMP_RISING("온도 상승 추세", "장비 온도가 지속적으로 상승하고 있습니다." , "과열 발생 가능성이 있습니다.", 50);

    private final String title;
    private final String description;
    private final String recommendation;
    private final int score;

    InsightType(String title, String description, String recommendation, int score) {
        this.title = title;
        this.description = description;
        this.recommendation = recommendation;
        this.score = score;
    }

    public String getTitle() {
        return title;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public String getDescription() {
        return description;
    }

    public int getScore() {
        return score;
    }
}
