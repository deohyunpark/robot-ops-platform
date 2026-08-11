package com.example.robotops.domain.service.daisy;

import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.DeviceSummaryRepositoryCustom;
import com.example.robotops.domain.response.DeviceStateResponse;
import com.example.robotops.domain.response.DeviceSummaryResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.redis.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceTool {

    private final RedisService redisService;
    private final DeviceSummaryRepositoryCustom deviceSummaryRepository;
    private final DeviceEventRepository deviceEventRepository;
    /**
     *  현재 온라인인 장비는 몇 대인가요?
     * 오프라인 장비만 보여주세요.
     * 배터리 20% 이하 장비를 알려주세요.
     * 현재 충전 중인 장비는?
     * 현재 작업 중인 로봇은?
     * 유휴(IDLE) 상태 장비만 보여주세요.
     * 가장 오래 작업 중인 장비는?
     * 최근 접속한 장비 순으로 보여주세요.
     * 마지막 Heartbeat가 가장 오래된 장비는?
     * 현재 위험도가 가장 높은 장비는?
     *
     * 상태 분석
     * R01 상태를 설명해주세요.
     * R03은 왜 위험한가요?
     * 현재 가장 문제가 되는 장비는?
     * 배터리가 부족한 이유가 뭔가요?
     * 현재 생산성이 떨어지는 이유는?
     * 어떤 장비를 먼저 점검해야 하나요?
     * 위험도가 높은 순으로 정렬해주세요.
     * 온도가 가장 높은 장비는?
     * CPU 사용률이 높은 장비는?
     * 네트워크 문제가 의심되는 장비는?
     * 4. AI 분석 질문
     * 오늘 장애 패턴을 분석해주세요.
     * 최근 반복되는 문제가 있나요?
     * 장애 원인을 추정해주세요.
     * 운영자가 가장 먼저 해야 할 일은?
     * 예방할 수 있는 장애가 있나요?
     * 앞으로 위험해질 가능성이 있는 장비는?
     * 최근 추세를 요약해주세요.
     * 오늘 운영 상태를 3줄로 요약해주세요.
     * AI가 생각하는 가장 큰 리스크는?
     * 현재 공장을 한 문장으로 설명해주세요.
     * 5. 생산성/KPI
     * 오늘 처리량은 얼마인가요?
     * 가동률이 가장 높은 장비는?
     * 평균 배터리 잔량은?
     * 평균 온도는?
     * 시간당 생산량은?
     * 지난 1시간 동안 완료한 미션은?
     * 오늘 가장 많이 일한 로봇은?
     * 현재 공장 가동률은?
     * KPI를 요약해주세요.
     * 오늘 운영 점수를 100점 만점으로 평가해주세요.
     * 6. Tool Calling 시연용 (면접관들이 좋아함)
     * R01 장애 이력을 엑셀로 만들어주세요.
     * 오늘 장애 보고서를 PDF로 생성해주세요.
     * R03 최근 이벤트를 이메일로 보내주세요.
     * 오늘 위험 장비 목록을 CSV로 저장해주세요.
     * 최근 7일 장애 통계를 보여주세요.
     * 최근 충돌이 많은 장비 순위를 알려주세요.
     * 오늘 장애 발생 시간을 타임라인으로 보여주세요.
     * 위험도가 높은 장비만 지도에 표시해주세요.
     * 장비 R05의 최근 미션 이력을 보여주세요.
     * 점검이 필요한 장비 목록을 만들어주세요.
     * 7. 실무에서 진짜 나오는 질문 (가장 추천 ⭐)
     * "R01이 왜 멈췄죠?"
     * "가장 먼저 확인해야 할 장비가 어디죠?"
     * "생산성이 떨어진 원인이 뭔가요?"
     * "오늘 장애가 가장 많았던 시간은 언제인가요?"
     * "위험도가 높은 장비를 먼저 보여주세요."
     * "이 장비를 지금 멈춰야 하나요?"
     * "예방 정비가 필요한 장비가 있나요?"
     * "현재 운영 상태를 30초 안에 브리핑해주세요."
     * "오늘 가장 중요한 이슈 3개만 알려주세요."
     * "운영자가 지금 가장 먼저 해야 할 일은 무엇인가요?"
    */

    @Tool(description = """
            현재 로봇(Device)의 최신 상태를 조회한다.

            다음과 같은 질문에서 반드시 사용한다.
            - Robot01 상태 알려줘
            - 현재 배터리가 몇 퍼센트야?
            - 현재 온도가 얼마야?
            - 온라인인지 오프라인인지 알려줘
            - 현재 어떤 작업을 수행 중이야?
            - CPU, Memory 사용률을 알려줘

            Redis에 저장된 최신 상태를 조회하며
            절대로 추측해서 답변하지 않는다.
            사용률이나 퍼센트가 높은걸 묻는 질문엔 90이상인 것만 답변한다. 
            """)
    public DeviceStateResponse getDeviceState(
            @ToolParam(description = "조회할 로봇 ID")
            String deviceId
    ) {

        log.info(
                "[DAISY TOOL] getDeviceState called. deviceId={}",
                deviceId
        );

        DeviceStateResponse result = redisService.getState(deviceId).orElseThrow(
                () -> new RobotOpsException(ErrorCode.DEVICE_NOT_FOUND)
        );

        log.info(
                "[DAISY TOOL] getDeviceState result={}",
                result
        );

        return result;

    }

    @Tool(description = """
        특정 로봇의 현재 운영 상태와 최근 위험 상황을 종합 조회한다.

        다음 정보를 함께 반환한다.
        - Redis에 저장된 최신 로봇 상태
          (온라인 여부, 모드, 미션, 배터리, 온도, 속도, 위치,
           CPU·메모리 사용률, 센서 상태, 마지막 수신 시각)
        - PostgreSQL에 저장된 현재 이벤트 이력
          (충돌, 비상정지, 장애물, 과열, 저전력, 오프라인 등)
        - 해당 로봇의 가장 최근 AI 분석 결과
          (현재 상황, 가능한 원인, 권장 조치)
        - 탐지된 인사이트를 기반으로 계산된 최신 위험 점수와 위험 등급

        다음과 같은 종합적인 질문에 사용한다.
        - RBT-0001 현재 상태를 종합적으로 알려주세요.
        - 이 로봇은 지금 안전한가요?
        - RBT-0001에 문제가 있는지 확인해주세요.
        - 이 로봇이 왜 위험한가요?
        - 최근 장애와 AI 분석을 함께 보여주세요.
        - 지금 가장 주의해야 할 부분이 무엇인가요?
        
        장비 중지 여부를 질문받으면
        현재 상태, 미해결 이벤트, 위험도를 조회한다.
        
        EMERGENCY_STOP, COLLISION 등 즉각적인 안전 위험이 존재하면
        운영자에게 장비 정지 및 현장 확인을 권고할 수 있다.
        
        Tool 결과 없이 장비 중지를 임의로 권고하지 않는다.
        실제 제어 명령을 실행하지 않는다.

        단순히 현재 배터리나 온도처럼 최신 상태 하나만 묻는 경우에는
        getDeviceState를 사용한다.

        데이터가 존재하지 않는 항목은 추측하거나 생성하지 말고,
        조회 결과가 없다고 명확하게 답변한다.
        """)
    public DeviceSummaryResponse getDeviceSummary(
            @ToolParam(description = """
                종합 상태를 조회할 로봇 ID.
                예: RBT-0001
                사용자의 질문에 로봇 ID가 없으면 임의로 생성하지 않는다.
                """)
            String deviceId
    ) {
        // 조회

        log.info(
                "[DAISY TOOL] getDeviceSummary called. deviceId={}",
                deviceId
        );

        DeviceSummaryResponse result = deviceSummaryRepository.getDeviceSummary(deviceId);

        log.info(
                "[DAISY TOOL] getDeviceSummary result={}",
                result
        );

        return result;
    }

}
