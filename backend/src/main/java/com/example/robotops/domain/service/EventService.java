package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.DeviceEventRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventService {

    private final DeviceEventRepository deviceEventRepository;

    @Transactional
    public void emit(DeviceEvent deviceEvent) {
        deviceEventRepository.save(deviceEvent);
        // 웹소캣으로 실시간 전달
        // 카프카 비동기 스트림
    }
}
