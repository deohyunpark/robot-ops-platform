package com.example.robotops.domain.enums;

import com.example.robotops.domain.request.ChecklistItem;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import java.util.Arrays;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ActionCheckListTemplate {

    OFFLINE(
            EventType.OFFLINE,
            List.of(
                    new ChecklistItem("POWER", "장비 전원 상태 확인", 1),
                    new ChecklistItem("NETWORK", "네트워크 연결 상태 확인", 2),
                    new ChecklistItem("HEARTBEAT", "최근 Heartbeat 수신 여부 확인",3),
                    new ChecklistItem("MQTT", "MQTT 통신 상태 확인",4),
                    new ChecklistItem("REBOOT", "장비 재부팅 또는 재연결",5),
                    new ChecklistItem("ONLINE", "Online 상태 복구 확인",6)
            )
    ),

    LOW_BATTERY(
            EventType.LOW_BATTERY,
            List.of(
                    new ChecklistItem("STOP_JOB", "현재 작업 안전 종료",1),
                    new ChecklistItem("MOVE_CHARGER", "충전 스테이션 이동",2),
                    new ChecklistItem("CHECK_CHARGER", "충전기 연결 상태 확인",3),
                    new ChecklistItem("CHARGING", "충전 진행 여부 확인",4),
                    new ChecklistItem("BATTERY", "배터리 이상 여부 확인",5),
                    new ChecklistItem("RECOVERY", "배터리 30% 이상 충전 확인",6)
            )
    ),

    OVERHEAT(
            EventType.OVERHEAT,
            List.of(
                    new ChecklistItem("STOP", "장비 운행 중지",1),
                    new ChecklistItem("FAN", "냉각팬 동작 확인",2),
                    new ChecklistItem("AIRFLOW", "흡·배기구 막힘 여부 확인",3),
                    new ChecklistItem("ENVIRONMENT", "주변 환경 온도 확인",4),
                    new ChecklistItem("TEMP", "온도 정상 범위 복귀 확인",5),
                    new ChecklistItem("TEST", "시험 운행 수행",6)
            )
    ),

    EMERGENCY_STOP(
            EventType.EMERGENCY_STOP,
            List.of(
                    new ChecklistItem("SAFETY", "작업자 안전 확보",1),
                    new ChecklistItem("CAUSE", "비상정지 원인 확인",2),
                    new ChecklistItem("REMOVE_RISK", "위험 요소 제거",3),
                    new ChecklistItem("RESET", "E-Stop 해제",4),
                    new ChecklistItem("SENSOR", "센서 정상 동작 확인",5),
                    new ChecklistItem("TEST", "시험 운행 수행",6)
            )
    ),

    COLLISION(
            EventType.COLLISION,
            List.of(
                    new ChecklistItem("STOP", "장비 즉시 정지",1),
                    new ChecklistItem("SAFETY", "작업자 안전 확인",2),
                    new ChecklistItem("TARGET", "충돌 대상 확인",3),
                    new ChecklistItem("BODY", "장비 외관 손상 확인",4),
                    new ChecklistItem("BUMPER", "범퍼 및 센서 상태 확인",5),
                    new ChecklistItem("TEST", "시험 주행 수행",6)
            )
    ),

    OBSTACLE(
            EventType.OBSTACLE,
            List.of(
                    new ChecklistItem("STOP", "장비 감속 또는 정지",1),
                    new ChecklistItem("CAMERA", "카메라 영상 확인",2),
                    new ChecklistItem("REMOVE", "장애물 제거",3),
                    new ChecklistItem("SENSOR", "센서 상태 확인",4),
                    new ChecklistItem("PATH", "경로 재계획",5),
                    new ChecklistItem("TEST", "재주행 테스트",6)
            )
    ),

    IDLE(
            EventType.IDLE,
            List.of(
                    new ChecklistItem("MISSION", "작업 할당 여부 확인",1),
                    new ChecklistItem("DISPATCHER", "Dispatcher 연결 상태 확인",2),
                    new ChecklistItem("CAUSE", "대기 원인 확인",3),
                    new ChecklistItem("ASSIGN", "신규 작업 재할당",4),
                    new ChecklistItem("START", "작업 정상 시작 확인",5)
            )
    ),

    CHARGING(
            EventType.CHARGING,
            List.of(
                    new ChecklistItem("CONNECT", "충전 연결 상태 확인",1),
                    new ChecklistItem("PROGRESS", "충전 진행 여부 확인",2),
                    new ChecklistItem("CHARGER", "충전기 이상 여부 확인",3),
                    new ChecklistItem("BATTERY", "배터리 충전량 확인",4),
                    new ChecklistItem("RESUME", "충전 완료 후 작업 재개 확인",5)
            )
    ),

    ERROR(
            EventType.ERROR,
            List.of(
                    new ChecklistItem("CODE", "오류 코드 확인",1),
                    new ChecklistItem("LOG", "시스템 로그 확인",2),
                    new ChecklistItem("CAUSE", "원인 분석",3),
                    new ChecklistItem("RESTART", "장비 재시작",4),
                    new ChecklistItem("RECHECK", "동일 오류 재발 여부 확인",5),
                    new ChecklistItem("MAINTENANCE", "필요 시 유지보수 요청",6)
            )
    ),

    CPU_RISING(
            EventType.CPU_RISING,
            List.of(
                    new ChecklistItem("CPU", "CPU 사용률 확인",1),
                    new ChecklistItem("PROCESS", "실행 중 프로세스 확인",2),
                    new ChecklistItem("LOG", "시스템 로그 확인",3),
                    new ChecklistItem("OPTIMIZE", "불필요한 프로세스 종료",4),
                    new ChecklistItem("RECOVERY", "CPU 사용률 정상 복귀 확인",5)
            )
    ),

    TEMP_RISING(
            EventType.TEMP_RISING,
            List.of(
                    new ChecklistItem("TEMP", "현재 온도 확인",1),
                    new ChecklistItem("FAN", "냉각팬 상태 확인",2),
                    new ChecklistItem("AIRFLOW", "통풍 환경 점검",3),
                    new ChecklistItem("LOAD", "부하 작업 여부 확인",4),
                    new ChecklistItem("RECOVERY", "온도 정상 범위 복귀 확인",5)
            )
    ),

    SPEED_RISING(
            EventType.SPEED_RISING,
            List.of(
                    new ChecklistItem("SPEED", "현재 주행 속도 확인",1),
                    new ChecklistItem("LIMIT", "속도 제한 설정 확인",2),
                    new ChecklistItem("PATH", "경로 상태 확인",3),
                    new ChecklistItem("CONTROL", "제어 시스템 점검",4),
                    new ChecklistItem("RECOVERY", "정상 속도 복귀 확인",5),
                    new ChecklistItem("TEST", "시험 주행 수행",6)
            )
    );

    private final EventType eventType;
    private final List<ChecklistItem> items;

    public static ActionCheckListTemplate from(EventType eventType) {

        return Arrays.stream(values())
                .filter(template -> template.eventType == eventType)
                .findFirst()
                .orElseThrow(() ->
                        new RobotOpsException(ErrorCode.EVENT_TYPE_NOT_FOUND));
    }
}