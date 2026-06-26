package com.example.robotops.domain.service;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.ThroughputPoint;
import com.example.robotops.domain.response.ThroughputResponse;
import com.example.robotops.domain.response.TotalUtilizationResponse;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.infra.redis.RedisService;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashBoardService {

    private final RedisService redisService;
    private final DeviceStateRepository deviceStateRepository;

    private static long parseLongOrZero(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw)) {
            return 0L;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    public ThroughputResponse getThroughput() {

        Map<String, Long> throughput = redisService.getThroughput();
        long current = throughput.get("current");
        long prev = throughput.get("prev");
        long today = throughput.get("today");

        Map<String, String> label = redisService.bucketLabel();
        System.out.printf("label: %s\n", label.get("start"));
        double rate = prev == 0 ? 0 :
                ((double)(current - prev) / prev) * 100;

        return ThroughputResponse.builder()
                .current15MinCount(current)
                .hourlyRate(current * 4)
                .todayCount(today)
                .changeRate(rate)
                .bucketTime(label)
                .chart(getRecent12Buckets())
                .build();
    }

    private List<ThroughputPoint> getRecent12Buckets() {

        List<String> keys = new ArrayList<>();
        List<OffsetDateTime> buckets = new ArrayList<>();

        OffsetDateTime current = redisService.currentBucketStart();

        for (int i = 11; i >= 0; i--) {

            OffsetDateTime bucket = current.minusMinutes(i * 15);

            buckets.add(bucket);
            keys.add(redisService.bucketKey(bucket));
        }

        List<String> values = redisService.getMultiValue(keys);


        List<ThroughputPoint> result = new ArrayList<>();

        for (int j = 0; j < keys.size(); j++) {

            String value = values.get(j);

            long count =
                    value == null ? 0 : Long.parseLong(value);

            result.add(
                    new ThroughputPoint(
                            buckets.get(j).toString(),
                            count
                    )
            );
        }

        return result;
    }

    public List<UtilizationResponse> getUtilization() {

        List<String> deviceIdList = deviceStateRepository.findAllDeviceId();

        long currentBucketStart = redisService.currentBucketStart().toInstant().toEpochMilli();

        return deviceIdList.stream().map(
                deviceId -> {
                    Map<String, String> utilizationValueByDevice = redisService.getUtilizationValueByDevice(deviceId);
                    return UtilizationResponse.from(deviceId,
                            currentBucketStart,
                            utilizationValueByDevice);
                }
        ).toList();
    }

    public TotalUtilizationResponse getTotalUtilization() {

        Map<String, String> totalUtilizationValue = redisService.getTotalUtilizationValue();
        long totalSeconds = parseLongOrZero(totalUtilizationValue.get("totalSeconds"));
        long activeSeconds = parseLongOrZero(totalUtilizationValue.get("activeSeconds"));

        double utilization = totalSeconds == 0 ? 0 : (activeSeconds * 100.0) / totalSeconds;

        return TotalUtilizationResponse.of(utilization);
    }



}
