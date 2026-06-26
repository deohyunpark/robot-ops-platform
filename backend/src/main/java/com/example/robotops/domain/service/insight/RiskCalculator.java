package com.example.robotops.domain.service.insight;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RiskCalculator {

    // todo: InsightHandler 에서 온 DeviceInsight 를 계산 후 Insight Publisher Insight DB 저장, Redis 저장, Websocket 발행
}
