package com.example.robotops.domain.service.daisy;

import com.example.robotops.domain.response.DailyReportResponse;
import com.example.robotops.domain.service.DailyReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DailyReportTool {

    private final DailyReportService dailyReportService;

    @Tool(description = """
            오늘 하루의 로봇 운영 리포트 생성을 위한 실제 운영 데이터를 조회한다.
            
                                                    반환 데이터
            
                                                    1. overview (운영 KPI)
                                                    - total : 전체 장비 수
                                                    - online : 현재 온라인 장비 수
                                                    - offline : 현재 오프라인 장비 수
                                                    - critical : 해결되지 않은 Critical 이벤트 수
                                                    - warning : 해결되지 않은 Warning 이벤트 수
            
                                                    2. statistics (운영 통계)
                                                    - throughput : 오늘 완료된 작업량
                                                    - utilization : 장비별 및 평균 가동률
            
                                                    3. events
                                                    - 오늘 발생한 이벤트 목록
                                                    - 발생 시간, 장비, 이벤트 종류, 심각도 포함
            
                                                    4. priorityDevices
                                                    - 운영자가 가장 먼저 확인해야 하는 장비 목록
                                                    - OPEN 상태의 Critical 이벤트
                                                    - Risk Score
                                                    - 최근 이벤트를 기준으로 우선순위가 계산된다.
            
                                                    5. analyses
                                                    - 각 장비의 최신 AI 분석 결과
                                                    - 현재 상황
                                                    - 가능한 원인
                                                    - 권장 조치
            
                                                    다음과 같은 질문에서 반드시 사용한다.
                                                    - 오늘 하루 리포트 작성해줘
                                                    - 오늘 운영 보고서 만들어줘
                                                    - 오늘 상황 브리핑해줘
                                                    - 오늘 가장 중요한 이슈를 알려줘
                                                    - 오늘 생산성과 장애 현황을 요약해줘
            
                                                    응답 작성 규칙
                                                    - 반환된 데이터를 그대로 사용한다.
                                                    - 존재하지 않는 데이터는 추측하지 않는다.
                                                    - 전체 운영 상황을 요약하는 형태로 답변한다.
                                                    - 위험도가 높은 장비와 주요 장애를 우선 설명한다.
            """)
    public DailyReportResponse getDailyReport() {

        log.info(
                "[DAISY TOOL] getDailyReport called"
        );

        return dailyReportService
                .createDailyReport();
    }
}
