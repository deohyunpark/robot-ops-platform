package com.example.robotops.infra.websocket;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.domain.response.ThroughputResponse;
import com.example.robotops.domain.response.TotalUtilizationResponse;
import com.example.robotops.infra.openai.AiSummaryResponse;
import com.example.robotops.infra.redis.JsonUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebsocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final JsonUtil jsonUtil;

//    @TransactionalEventListener(phase = AFTER_COMMIT)
//    public void broadcastEvent(DeviceEventResponse deviceEventResponse) {
//        messagingTemplate.convertAndSend("/robot/device/event",
//                jsonUtil.toJson(deviceEventResponse));
//        log.info("[WS] Pushed event = {}", deviceEventResponse.deviceId());
//        // todo : 레디스에서 긁어오기
//    }

    public void broadcastDeviceState(TelemetryPayload payload) {
        messagingTemplate.convertAndSend("/robot/device/state",
                jsonUtil.toJson(payload));
    }

    public void broadcastThroughput(ThroughputResponse throughputResponse) {
        messagingTemplate.convertAndSend( "/robot/device/throughput",
                throughputResponse);
    }

    public void broadcastTotalUtilization(TotalUtilizationResponse totalUtilizationResponse) {
        messagingTemplate.convertAndSend("/robot/device/totalUtilization",
                totalUtilizationResponse);
    }

    public void broadcastAllEvents(List<RedisEventResponse> redisEventResponses) {
        messagingTemplate.convertAndSend("/robot/device/events",
                redisEventResponses);
    }

    public void broadcastOffline(List<RedisEventResponse> redisEventResponses) {
        messagingTemplate.convertAndSend("/robot/device/offline",
                redisEventResponses);
    }

    public void broadcastInsightFeed(AiSummaryResponse aiSummaryResponse) {
        messagingTemplate.convertAndSend("/robot/device/feed",
                aiSummaryResponse);
    }


}
