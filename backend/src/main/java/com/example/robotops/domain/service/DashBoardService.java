package com.example.robotops.domain.service;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.ThroughputPoint;
import com.example.robotops.domain.response.ThroughputResponse;
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

        // Todo: time match check
        long currentBucketStart = redisService.currentBucketStart().toInstant().toEpochMilli();

        return deviceIdList.stream().map(
                deviceId ->
                        UtilizationResponse.from(deviceId,
                                currentBucketStart,
                                redisService.getUtilizationValue(deviceId))
        ).toList();
    }
}
