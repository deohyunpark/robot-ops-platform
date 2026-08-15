package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.AiAnalysis;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.repository.AiAnalysisRepository;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.DeviceStateRepository;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.PriorityDeviceResponse;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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



    // 전체 데이터 조회
    public List<PriorityDeviceResponse> getPriorityDevices() {

        OffsetDateTime from =
                OffsetDateTime.now()
                        .minusHours(24);

        log.info("Query execution started createPriorityResponse");
        // id 추출
        List<String> deviceIds =
                deviceStateRepository.findAllDeviceId();

        // 미해결 된 이벤트 추출
        List<DeviceEvent> openEvents =
                deviceEventRepository.findAllOpenEvents(deviceIds);

        // AI 분석결과 -> from to score
        List<AiAnalysis> aiAnalyses =
                aiAnalysisRepository.findAllByRobotIds(deviceIds, from);

        Map<String, List<DeviceEvent>> eventsByDevice =
                openEvents.stream()
                        .collect(
                                Collectors.groupingBy(
                                        DeviceEvent::getDeviceId
                                )
                        );

        Map<String, List<AiAnalysis>> analysesByDevice =
                aiAnalyses.stream()
                        .collect(
                                Collectors.groupingBy(
                                        AiAnalysis::getRobotId
                                )
                        );

        log.info("Query execution finished createPriorityResponse");

        return deviceIds.stream()
                .map(deviceId ->
                        createPriorityResponse(
                                deviceId,
                                eventsByDevice.getOrDefault(
                                        deviceId,
                                        List.of()
                                ),
                                analysesByDevice.getOrDefault(
                                        deviceId,
                                        List.of()
                                )
                        )
                )
                .sorted(priorityComparator())
                .toList();
    }


    // 여기서 조립
    private PriorityDeviceResponse createPriorityResponse(
            String deviceId,
            List<DeviceEvent> openEvents,
            List<AiAnalysis> aiAnalyses
    ) {


        List<DeviceEvent> deviceEvents =
                openEvents.stream()
                        .filter(event ->
                                event.getDeviceId().equals(deviceId)
                        )
                        .toList();

        boolean hasOpenCritical =
                deviceEvents.stream()
                        .anyMatch(event ->
                                event.getSeverity() == Severity.CRITICAL
                        );

        OffsetDateTime latestEventAt =
                deviceEvents.stream()
                        .map(DeviceEvent::getCreatedAt)
                        .max(Comparator.naturalOrder())
                        .orElse(null);

        DeviceEvent primaryOpenEvent =
                deviceEvents.stream()
                        .min(
                                Comparator
                                        .comparingInt(this::severityOrder)
                                        .thenComparing(
                                                DeviceEvent::getCreatedAt,
                                                Comparator.reverseOrder()
                                        )
                        )
                        .orElse(null);

        DeviceEventResponse deviceEventResponse =
                primaryOpenEvent == null
                        ? null
                        : DeviceEventResponse.of(primaryOpenEvent);

        AiAnalysis aiAnalysis =
                aiAnalyses.stream()
                        .filter(ai ->
                                ai.getRobotId().equals(deviceId)
                        )
                        .max(
                                Comparator.comparing(
                                        AiAnalysis::getCreatedAt
                                )
                        )
                        .orElse(null);

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

    private int severityOrder(DeviceEvent event) {

        return switch (event.getSeverity()) {
            case CRITICAL -> 1;
            case WARNING -> 2;
            default -> 3;
        };
    }

    public List<PriorityDeviceResponse> getPriorityDevicesDeprecated() {

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
