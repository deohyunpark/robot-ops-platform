package com.example.robotops.domain.service;

import com.example.robotops.domain.service.daisy.DailyReportTool;
import com.example.robotops.domain.service.daisy.DeviceTool;
import com.example.robotops.domain.service.daisy.EventTool;
import com.example.robotops.domain.service.daisy.OperationTool;
import com.example.robotops.observability.RobotOpsGrafanaMetrics;
import io.micrometer.core.instrument.Timer;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DaisyAssistantService {

    private final ChatClient daisyChatClient;
    private final EventTool eventTool;
    private final DeviceTool deviceTool;
    private final OperationTool operationTool;
    private final DailyReportTool dailyReportTool;
    private final RobotOpsGrafanaMetrics metrics;

    public String askEvent(String message) {
        Timer.Sample sample = metrics.startDaisyChat();
        try {
            String answer = chat(message);
            metrics.stopDaisyChat(sample, "success");
            return answer;
        } catch (RuntimeException ex) {
            metrics.stopDaisyChat(sample, "error");
            throw ex;
        }
    }

    private String chat(String message) {
        ZoneId zoneId = ZoneId.of("Asia/Seoul");
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        return daisyChatClient
                .prompt()
                .system(
                        """
                당신은 로봇 관제 시스템 AI입니다.

                현재 한국 시각은 %s입니다.
                오늘 날짜는 %s입니다.
                모든 상대 시간은 Asia/Seoul을 기준으로 계산하세요.

                사용자가 '오늘'이라고 하면:
                - from: 오늘 00:00:00+09:00
                - to: 현재 시각

                사용자가 '어제'라고 하면:
                - from: 어제 00:00:00+09:00
                - to: 오늘 00:00:00+09:00
                
                실제 운영 데이터가 필요한 질문은
                반드시 제공된 Tool을 사용합니다.
                
                사용자가 오늘 하루 운영 리포트,
                운영 브리핑 또는 오늘 주요 이슈 정리를 요청하면
                getDailyReport Tool을 사용합니다.
            
                DailyReport Tool 결과를 기반으로 다음 순서로
                운영 보고서를 작성합니다.
            
                   1. 오늘 운영 현황
                   2. 주요 장애
                   3. 위험 장비
                   4. 생산성과 가동률
                   5. 오늘의 핵심 이슈
                   6. 운영자 권장 조치
                
                Tool 결과에 존재하지 않는 원인,
                수치 또는 사실은 만들어내지 않습니다.
                
                위험도가 높은 문제와
                해결되지 않은 Critical 이벤트를
                우선적으로 설명합니다.
                """.formatted(now, now.toLocalDate())
                )
                .user(message)
                .tools(
                        eventTool, deviceTool, operationTool, dailyReportTool
                )
                .advisors(new SimpleLoggerAdvisor())
                .call()
                .content();
    }
}
