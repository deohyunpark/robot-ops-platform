package com.example.robotops.infra.websocket;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.infra.redis.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebsocketService {

    private final EventWebsocketHandler handler;
    private final JsonUtil jsonUtil;

    public void pushEvent(DeviceEvent event) {
        handler.broadcast(jsonUtil.toJson(DeviceEventResponse.of(event)));
    }
}
