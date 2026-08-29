package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.response.DeviceEventResponse;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.global.errorMessage.StringEnum;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventService {

    private final DeviceEventRepository deviceEventRepository;
    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;

    @Transactional
    public void process(DeviceEvent deviceEvent) {
        if (!redisService.acquireEventDedup(deviceEvent)) {
            return;
        }

        boolean synchronizationActive = TransactionSynchronizationManager.isSynchronizationActive();
        if (synchronizationActive) {
            TransactionSynchronizationManager.registerSynchronization(
                    new DeviceEventProcessSynchronization(
                            deviceEvent,
                            redisService,
                            kafkaProducer
                    )
            );
        }

        try {
            deviceEventRepository.save(deviceEvent);

            // @Transactional 없는 단위 테스트 fallback
            if (!synchronizationActive) {
                redisService.registerEventInFeed(deviceEvent);
                kafkaProducer.sendAllEvents(deviceEvent.getDeviceId());
            }
        } catch (RuntimeException ex) {
            if (!synchronizationActive) {
                redisService.releaseEventDedup(deviceEvent);
            }
            throw ex;
        }
    }

    public List<RedisEventResponse> getOffLineDevices() {

        return getAllDeviceEvents().stream().filter(
                event -> StringEnum.from(EventType.class, event.eventName()) == EventType.OFFLINE
        ).toList();
    }

    public List<RedisEventResponse> getAllDeviceEvents() {
        Set<TypedTuple<String>> allEvents = redisService.getAllEvents();

        return allEvents.stream()
                .map(tuple -> {

                    String[] split =
                            tuple.getValue().split(":", 3);

                    OffsetDateTime createdAt =
                            Instant.ofEpochMilli(
                                            tuple.getScore().longValue()
                                    )
                                    .atZone(ZoneId.of("Asia/Seoul"))
                                    .toOffsetDateTime();

                    return RedisEventResponse.of(split[0],
                            split[1],
                            split[2],
                            createdAt

                    );
                })
                .toList();
    }

    public List<DeviceEventResponse> getDeviceEventsByRobotId(String robotId) {
        return deviceEventRepository.findAllDeviceEvents(robotId).stream().map(DeviceEventResponse::of).toList();
    }


    public List<DeviceEventResponse> findTodayEvents(OffsetDateTime from, OffsetDateTime to) {
        return deviceEventRepository.findTodayEvents(from, to);
    }

    public List<DeviceEventResponse> findOfflineEvents(OffsetDateTime from, OffsetDateTime to) {
        return deviceEventRepository.findOfflineEvents(from, to);
    }
}
