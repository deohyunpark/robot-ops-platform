package com.example.robotops.domain.response;

import java.util.List;
import java.util.Map;
import lombok.Builder;

@Builder
public record ThroughputResponse(

        long current15MinCount,     // 최근 15분 생산량
        long hourlyRate,    // 시간당 환산 생산률
        long todayCount,    // 오늘 총 생산량
        double changeRate,  // 이전 15분 대비 %
        Map<String, String> bucketTime,  // 수치 기준 시간
        List<ThroughputPoint> chart // 시간 흐름 추세 chart
) {
}
