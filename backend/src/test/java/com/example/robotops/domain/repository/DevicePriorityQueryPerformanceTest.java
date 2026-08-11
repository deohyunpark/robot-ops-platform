package com.example.robotops.domain.repository;

//todo : N+1 성능개선

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

import com.example.robotops.domain.response.PriorityDeviceResponse;
import com.example.robotops.domain.service.DevicePriorityService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class DevicePriorityQueryPerformanceTest {

    @Autowired
    private DevicePriorityService devicePriorityService;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Autowired
    private EntityManager entityManager;

    private Statistics statistics;

    @BeforeEach
    void setUp() {

        SessionFactory sessionFactory =
                entityManagerFactory.unwrap(
                        SessionFactory.class
                );

        statistics =
                sessionFactory.getStatistics();

        statistics.setStatisticsEnabled(true);
        statistics.clear();

    }

    @Test
    @DisplayName("우선순위 장비 조회 SQL 개수를 측정한다")
    void getPriorityDevices_queryCount() {

        int warmUpCount = 10;
        int testCount = 100;

        // =========================
        // Warm-up
        // =========================

        for (int i = 0; i < warmUpCount; i++) {
            entityManager.clear();
            devicePriorityService.getPriorityDevices();
        }

        List<Double> executionTimes = new ArrayList<>();
        List<Long> queryCounts = new ArrayList<>();

        List<PriorityDeviceResponse> lastResult = null;

        // =========================
        // Performance Test
        // =========================

        for (int i = 0; i < testCount; i++) {
            entityManager.clear();
            statistics.clear();

            long startTime = System.nanoTime();

            List<PriorityDeviceResponse> result =
                    devicePriorityService.getPriorityDevices();

            long endTime = System.nanoTime();

            double executionTimeMs =
                    (endTime - startTime) / 1_000_000.0;

            long queryCount =
                    statistics.getPrepareStatementCount();

            executionTimes.add(executionTimeMs);
            queryCounts.add(queryCount);

            lastResult = result;
        }

        // =========================
        // Average
        // =========================

        double averageTime =
                executionTimes.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0.0);

        double averageQueryCount =
                queryCounts.stream()
                        .mapToLong(Long::longValue)
                        .average()
                        .orElse(0.0);

        // =========================
        // P95
        // =========================

        Collections.sort(executionTimes);

        int p95Index =
                (int) Math.ceil(testCount * 0.95) - 1;

        double p95Time =
                executionTimes.get(p95Index);

        // =========================
        // Min / Max
        // =========================

        double minTime =
                executionTimes.get(0);

        double maxTime =
                executionTimes.get(
                        executionTimes.size() - 1
                );

        // =========================
        // Result
        // =========================

        System.out.println();
        System.out.println(
                "=========================================="
        );

        System.out.println(
                " DEVICE COUNT : "
                        + lastResult.size()
        );

        System.out.println(
                " TEST COUNT : "
                        + testCount
        );

        System.out.println(
                " AVG QUERY COUNT : "
                        + averageQueryCount
        );

        System.out.println(
                " AVG EXECUTION TIME : "
                        + averageTime
                        + " ms"
        );

        System.out.println(
                " P95 EXECUTION TIME : "
                        + p95Time
                        + " ms"
        );

        System.out.println(
                " MIN EXECUTION TIME : "
                        + minTime
                        + " ms"
        );

        System.out.println(
                " MAX EXECUTION TIME : "
                        + maxTime
                        + " ms"
        );

        System.out.println(
                "=========================================="
        );

        assertThat(lastResult).isNotNull();
    }

}
