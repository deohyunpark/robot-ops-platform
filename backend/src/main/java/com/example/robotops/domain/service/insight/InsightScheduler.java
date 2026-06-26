package com.example.robotops.domain.service.insight;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InsightScheduler {

    @Scheduled(fixedRate = 5000) //5초마다 체크
    public void detectInsights() {

        log.info("[SCHEDULER] detectInsight running");

        //todo InsightAnalyzer 실행
        // 흐름 : telemetry -> redis -> insight scheduler
    }
}
