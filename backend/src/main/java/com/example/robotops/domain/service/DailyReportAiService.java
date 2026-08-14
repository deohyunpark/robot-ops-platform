package com.example.robotops.domain.service;

import com.example.robotops.domain.response.DailyReportResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DailyReportAiService {

    private final ChatClient daisyChatClient;
    private final ObjectMapper objectMapper;
    private final RobotOpsGrafanaMetrics metrics;

    public String createSummary(DailyReportResponse report) {
        return metrics.timeDailyReportAiSummary(() -> buildSummary(report));
    }

    private String buildSummary(DailyReportResponse report) {
        try {
            String reportJson = objectMapper.writeValueAsString(report);

            return daisyChatClient
                    .prompt()
                    .system("""
                            당신은 로봇 운영 관제 시스템의
                            일일 보고서를 작성하는 AI입니다.

                            제공된 데이터만 사용해
                            전문적인 일일 운영 보고서를 작성하세요.

                            다음 순서로 작성합니다.

                            1. 운영 요약
                            2. 주요 장애
                            3. 위험 장비
                            4. 생산성 및 가동률
                            5. 주요 이슈
                            6. 권장 조치

                            해결되지 않은 Critical 이벤트를
                            가장 중요하게 다룹니다.

                            데이터에 없는 사실이나 원인을
                            추측하지 않습니다.
                            """)
                    .user("""
                            다음은 오늘 실제 운영 데이터입니다.

                            %s

                            위 데이터를 기반으로
                            오늘 운영 보고서를 작성하세요.
                            """
                            .formatted(reportJson)
                    )
                    .call()
                    .content();
        } catch (JsonProcessingException exception) {
            throw new RobotOpsException(ErrorCode.MESSAGE_SERIALIZATION_FAILED);
        }
    }
}
