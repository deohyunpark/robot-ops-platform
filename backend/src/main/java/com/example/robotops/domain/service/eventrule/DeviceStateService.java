package com.example.robotops.domain.service.eventrule;

import com.example.robotops.infra.redis.RedisService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeviceStateService {

    private final RedisService redisService;

    public boolean isTrendingUp(String deviceId, double current, String metric) {

        // BATTERY, SPEED 이전값 기준 2씩 오른게 5번일때
        Double last = redisService.getMetric(deviceId, metric);
        int count = redisService.getCount(deviceId, metric);

        double diff = current - last;

        if (Math.abs(diff) < 0.2) {
            count++;
        } else {
            count = 0;
        }

        redisService.updateMetric(deviceId, metric, current);
        redisService.updateTrend(deviceId, metric, count);

        return count >= 5;
    }

    public boolean isHighOverTime(String deviceId, String metric) {

        // CPU / TEMP 평균이 기준값 이상 5번 유지시
        double threshold = 90.0;
        List<String> values = redisService.getWindow(deviceId, metric);


        if (values == null || values.isEmpty()) return false;

        return values.stream()
                .mapToDouble(Double::parseDouble)
                .filter(v -> v > threshold)
                .count() >= 5;
    }


}
