package com.example.robotops.infra.redis;

import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.service.DashBoardService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {
        "logging.level.org.apache.kafka=OFF",
        "logging.level.org.springframework.kafka=OFF"
})
@ActiveProfiles("test")
class RedisRoundTripPerformanceTest {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private RedisService redisService;

    @Autowired
    private DashBoardService dashBoardService;

    @Autowired
    private DeviceStateRepository deviceStateRepository;

    @Test
    @DisplayName("장비별 Redis 조회 성능을 측정한다")
    void getUtilization_individualRedisRead_performance() {

        int warmUpCount = 10;
        int testCount = 100;

        // Warm-up
        for (int i = 0; i < warmUpCount; i++) {
            dashBoardService.getUtilizationDeprecated();
        }

        List<Double> executionTimes = new ArrayList<>();

        // 실제 측정
        for (int i = 0; i < testCount; i++) {

            long start = System.nanoTime();

            dashBoardService.getUtilization();

            long end = System.nanoTime();

            double elapsedMs =
                    (end - start) / 1_000_000.0;

            executionTimes.add(elapsedMs);
        }

        List<String> allDeviceId = deviceStateRepository.findAllDeviceId();

        // 정렬
        Collections.sort(executionTimes);

        double avg =
                executionTimes.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0);

        double min =
                executionTimes.get(0);

        double max =
                executionTimes.get(
                        executionTimes.size() - 1
                );

        int p95Index =
                (int) Math.ceil(
                        executionTimes.size() * 0.95
                ) - 1;

        double p95 =
                executionTimes.get(p95Index);

        System.out.printf("""
        ===== REDIS ROUND TRIP PERFORMANCE =====
        DEVICE COUNT : %d
        TEST COUNT   : %d
        AVG          : %.3f ms
        P95          : %.3f ms
        MIN          : %.3f ms
        MAX          : %.3f ms
        %n""",
                allDeviceId.size(),
                testCount,
                avg,
                p95,
                min,
                max
        );
    }
    @ParameterizedTest
    @ValueSource(ints = {30, 100, 1000})
    @DisplayName("장비 수에 따른 Redis 조회 성능을 측정한다")
    void redisPerformance(int deviceCount) {

        List<String> deviceIds =
                createDeviceIds(deviceCount);

        prepareRedisData(deviceIds);

        measure(deviceIds);

    }

    private void measure(List<String> deviceIds) {

        int warmUpCount = 10;
        int testCount = 100;

        for (int i = 0; i < warmUpCount; i++) {
            readUtilization(deviceIds);
        }

        List<Double> times = new ArrayList<>();

        for (int i = 0; i < testCount; i++) {

            long start = System.nanoTime();

            readUtilization(deviceIds);

            long end = System.nanoTime();

            times.add(
                    (end - start) / 1_000_000.0
            );
        }

        Collections.sort(times);

        double avg =
                times.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0);

        int p95Index =
                (int) Math.ceil(
                        times.size() * 0.95
                ) - 1;

        double p95 = times.get(p95Index);

        System.out.printf("""
            ===== REDIS PERFORMANCE =====
            DEVICE COUNT : %d
            TEST COUNT   : %d
            AVG          : %.3f ms
            P95          : %.3f ms
            MIN          : %.3f ms
            MAX          : %.3f ms
            %n""",
                deviceIds.size(),
                testCount,
                avg,
                p95,
                times.get(0),
                times.get(times.size() - 1)
        );
    }


    // 기존
//    private void readUtilization(
//            List<String> deviceIds
//    ) {
//
//        for (String deviceId : deviceIds) {
//            redisService
//                    .getUtilizationValueByDevice(
//                            deviceId
//                    );
//        }
//    }

    // 변경
    private void readUtilization(
            List<String> deviceIds
    ) {

        redisService
                .getUtilizationValuesByDevices(
                        deviceIds
                );
    }

    private List<String> createDeviceIds(int count) {
        return IntStream.rangeClosed(1, count)
                .mapToObj(i -> "RBT-%04d".formatted(i))
                .toList();
    }

    private void prepareRedisData(List<String> deviceIds) {

        for (String deviceId : deviceIds) {

            String key =
                    redisService.current15MinBucketKeyByDeviceId(deviceId);

            stringRedisTemplate.opsForHash().putAll(
                    key,
                    Map.of(
                            "totalSeconds", "900",
                            "activeSeconds", "700"
                    )
            );
        }
    }


}
