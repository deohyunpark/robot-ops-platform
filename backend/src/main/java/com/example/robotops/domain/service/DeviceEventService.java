package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.infra.redis.RedisService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventService {

    private final DeviceEventRepository deviceEventRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final RedisService redisService;

    @Transactional
    public void process(DeviceEvent deviceEvent) {

        if (!redisService.tryAcquire(deviceEvent)) {
            return;
        }

        deviceEventRepository.save(deviceEvent);
        log.info("[DB] Device event insert = {}", deviceEvent.getDeviceId());

        applicationEventPublisher.publishEvent(
                DeviceEventResponse.of(deviceEvent)
        );
    }

}
