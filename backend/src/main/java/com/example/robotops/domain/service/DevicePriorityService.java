package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.AiAnalysis;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.AiAnalysisRepository;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.PriorityDeviceResponse;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DevicePriorityService {

    private final DeviceStateRepository deviceStateRepository;
    private final DeviceEventRepository deviceEventRepository;
    private final AiAnalysisRepository aiAnalysisRepository;

    public List<PriorityDeviceResponse> getPriorityDevices() {

        List<String> deviceIds =
                deviceStateRepository.findAllDeviceId();

        return deviceIds.stream()
                .map(this::createPriorityResponse)
                .sorted(priorityComparator())
                .toList();
    }

    private PriorityDeviceResponse createPriorityResponse(String deviceId) {
        /** exception ㄴㄴ 데이터 없으면 널 넣어서 상태만 보여주기
        */
        // critical 이 있는지
        log.info("Query execution started createPriorityResponse : {}", deviceId);

        boolean hasOpenCritical =
                deviceEventRepository
                        .existsOpenCritical(deviceId);

        // 가장 최근 이벤트 시간
        OffsetDateTime latestEventAt =
                deviceEventRepository
                        .findLatestOpenEventAt(deviceId)
                        .orElse(null);

        // 해결되지 않은 이벤트중 위험도 높은 이벤트
        DeviceEvent primaryOpenEvent =
                deviceEventRepository
                        .findHighestPriorityOpenEvent(deviceId)
                        .orElse(null);

        DeviceEventResponse deviceEventResponse = primaryOpenEvent == null
                ? null
                : DeviceEventResponse.of(primaryOpenEvent);

        // insight 중 위험도 높은 insight
        AiAnalysis aiAnalysis = aiAnalysisRepository.findHighestPriorityAiAnalysis(deviceId)
                .orElse(null);

        log.info("Query execution completed createPriorityResponse: {}", deviceId);

        int riskScore =
                aiAnalysis == null
                        ? 0
                        : aiAnalysis.getRiskScore();

        String riskLevel =
                aiAnalysis == null
                        ? "NONE"
                        : aiAnalysis.getRiskLevel();

        return PriorityDeviceResponse.of(
                deviceId,
                hasOpenCritical,
                deviceEventResponse,
                riskScore,
                riskLevel,
                latestEventAt
        );
    }

    private Comparator<PriorityDeviceResponse> priorityComparator() {

        // critical 여부 -> risk score -> 최신이벤트 순으로 비교
        return Comparator
                .comparing(
                        PriorityDeviceResponse::hasOpenCritical
                )
                .reversed()

                .thenComparing(
                        PriorityDeviceResponse::riskScore,
                        Comparator.reverseOrder()
                )

                .thenComparing(
                        PriorityDeviceResponse::latestEventAt,
                        Comparator.nullsLast(
                                Comparator.reverseOrder()
                        )
                );
    }
}
