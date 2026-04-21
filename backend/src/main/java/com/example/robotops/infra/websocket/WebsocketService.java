package com.example.robotops.infra.websocket;

import com.example.robotops.application.telemetry.request.payload.TelemetryPayload;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebsocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final JsonUtil jsonUtil;

    public void pushEvent(DeviceEvent event) {
        messagingTemplate.convertAndSend("/robot/device/event",
                jsonUtil.toJson(DeviceEventResponse.of(event)));
    }

    public void broadcastDeviceState(TelemetryPayload payload) {
        messagingTemplate.convertAndSend("/robot/device/state",
                jsonUtil.toJson(payload));
    }
}
