package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.infra.websocket.WebsocketService;
import jakarta.transaction.Transactional;
import java.nio.file.WatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventService {

    private final DeviceEventRepository deviceEventRepository;
    private final WebsocketService websocketService;

    @Transactional
    public void emit(DeviceEvent deviceEvent) {
        deviceEventRepository.save(deviceEvent);
        // 웹소캣으로 실시간 전달
        websocketService.pushEvent(deviceEvent);
        // 카프카 비동기 스트림
    }
}
