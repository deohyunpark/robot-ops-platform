package com.example.robotops.domain.service.eventrule;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatefulRule {


    public boolean isTrendingUp(EventContext eventContext) {

        // SPEED 이전값 기준 2씩 오른게 5번일때
        Double last = eventContext.snapshot().lastSpeed();
        int count = eventContext.snapshot().countSpeed();

        double diff = eventContext.battery() - last;

        if (Math.abs(diff) < 0.2) {
            count++;
        } else {
            count = 0;
        }

        return count >= 5;
    }

    public boolean isHighOverTime(EventContext eventContext, String metricName) {

        // CPU / TEMP 평균이 기준값 이상 5번 유지시
        double threshold = 90.0;

        List<String> values = "cpu".equals(metricName)
                ? eventContext.snapshot().cpuWindow()
                : eventContext.snapshot().tempWindow();

        if (values == null || values.isEmpty()) return false;

        return values.stream()
                .mapToDouble(Double::parseDouble)
                .filter(v -> v > threshold)
                .count() >= 5;
    }


}
