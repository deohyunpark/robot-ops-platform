package com.example.robotops.domain.repository;

import com.example.robotops.domain.response.AiAnalysisResponse;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.DeviceStateResponse;
import com.example.robotops.domain.response.DeviceSummaryResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.redis.RedisService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class DeviceSummaryRepositoryCustomImpl implements DeviceSummaryRepositoryCustom{

    private final RedisService redisService;
    private final DeviceEventRepository deviceEventRepository;
    private final AiAnalysisRepository aiAnalysisRepository;

    @Override
    public DeviceSummaryResponse getDeviceSummary(String deviceId) {

        DeviceStateResponse deviceStateResponse = redisService.getState(deviceId)
                .orElseThrow(() -> new RobotOpsException(ErrorCode.DEVICE_NOT_FOUND));

        List<DeviceEventResponse> allUnresolvedDeviceEvents = deviceEventRepository.findAllUnresolvedDeviceEvents(deviceId)
                .stream().map(DeviceEventResponse::of).toList();

        AiAnalysisResponse aiAnalysisResponse = AiAnalysisResponse.of(
                aiAnalysisRepository.findTopByRobotIdOrderByCreatedAtDesc(deviceId).orElseThrow(
                        () -> new RobotOpsException(ErrorCode.INSIGHT_NOT_FOUND)
                ));

        return DeviceSummaryResponse.of(deviceStateResponse, allUnresolvedDeviceEvents, aiAnalysisResponse);
    }
}
