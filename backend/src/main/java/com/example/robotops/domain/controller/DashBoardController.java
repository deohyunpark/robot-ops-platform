package com.example.robotops.domain.controller;


import com.example.robotops.domain.deviceStateType.RiskLevel;
import com.example.robotops.domain.response.DeviceIdResponse;
import com.example.robotops.domain.response.DeviceInsightResponse;
import com.example.robotops.domain.response.DeviceRiskResponse;
import com.example.robotops.domain.response.InsightFeedResponse;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.domain.response.UtilizationResponse;
import com.example.robotops.domain.service.DashBoardService;
import com.example.robotops.domain.service.DeviceEventService;
import com.example.robotops.domain.service.DeviceStateService;
import com.example.robotops.infra.openai.AiSummaryResponse;
import com.example.robotops.infra.openai.OpenAiClient;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/dashboard")
public class DashBoardController {

    private final DashBoardService dashBoardService;
    private final DeviceEventService deviceEventService;
    private final DeviceStateService deviceStateService;
    private final OpenAiClient openAiClient;

    @GetMapping("/utilization")
    public List<UtilizationResponse> getUtilization() {
        return dashBoardService.getUtilization();
    }

    @GetMapping("/offline")
    public List<RedisEventResponse> getOffline() {
        return deviceEventService.getOffLineDevices();
    }

    @GetMapping("/all-events")
    public List<RedisEventResponse> getAllEvents() {
        return deviceEventService.getAllDeviceEvents();
    }

    @GetMapping("/device-list")
    public List<DeviceIdResponse> getAllDevices() {
        return deviceStateService.getAllDeviceList();
    }

    @GetMapping("/openai")
    public AiSummaryResponse test() {

        Map<String, Object> params = new HashMap<>();
        params.put("mode", "AUTO");
        params.put("mission", "PACK");
        params.put("speedMps", 0.93);
        params.put("seq", 1130);

        DeviceInsightResponse deviceInsightResponse = DeviceInsightResponse.builder()
                .insightTitle("CPU 사용률 상승")
                .insightDescription("CPU 사용률이 지속적으로 증가하고 있습니다.")
                .insightRecommendation("시스템 부하를 확인하세요.")
                .payloadType(params)
                .build();
        DeviceRiskResponse deviceRiskResponse = DeviceRiskResponse.builder()
                .riskLevel(RiskLevel.MIDDLE)
                .score(45)
                .build();
        InsightFeedResponse response = InsightFeedResponse.builder()
                .riskResponse(deviceRiskResponse)
                .insightResponses(Collections.singletonList(deviceInsightResponse))
                .build();


        return openAiClient.request(response);
    }


}
