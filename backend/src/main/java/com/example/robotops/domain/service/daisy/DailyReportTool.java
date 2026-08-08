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
            오늘 하루의 로봇 운영 리포트를 작성하기 위한
            실제 운영 데이터를 조회한다.

            다음 정보를 반환한다.
            - 전체 장비 수
            - 온라인 / 오프라인 장비 수
            - 해결되지 않은 Critical 이벤트 수
            - 오늘 생산량
            - 오늘 평균 가동률
            - 오늘 발생한 이벤트
            - 현재 우선 확인이 필요한 위험 장비

            다음과 같은 질문에서 반드시 사용한다.
            - 오늘 하루 리포트 정리해줘
            - 오늘 운영 보고서 작성해줘
            - 오늘 상황 브리핑해줘
            - 오늘 중요한 이슈를 정리해줘

            실제 운영 데이터가 필요한 내용은 추측하지 않는다.
            """)
    public DailyReportResponse getDailyReport() {

        log.info(
                "[DAISY TOOL] getDailyReport called"
        );

        return dailyReportService
                .createDailyReport();
    }
}
