package com.example.robotops.domain.service;

import com.example.robotops.domain.deviceStateType.EventType;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.response.RedisEventResponse;
import com.example.robotops.global.errorMessage.StringEnum;
import com.example.robotops.infra.kafka.consumer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceEventService {

    private final DeviceEventRepository deviceEventRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;

    @Transactional
    public void process(DeviceEvent deviceEvent) {

        if (!redisService.tryAcquire(deviceEvent)) {
            return;
        }
        deviceEventRepository.save(deviceEvent);

//        log.info("[DB] Device event insert = {}", deviceEvent.getDeviceId());

        // ws
        kafkaProducer.sendAllEvents(deviceEvent.getDeviceId());


    }

    public List<RedisEventResponse> getOffLineDevices() {
        List<RedisEventResponse> list = getAllDeviceEvents().stream().filter(
                event -> StringEnum.from(EventType.class, event.eventName()) == EventType.OFFLINE
        ).toList();


        return getAllDeviceEvents().stream().filter(
                event -> StringEnum.from(EventType.class, event.eventName()) == EventType.OFFLINE
        ).toList();
    }

    public List<RedisEventResponse> getAllDeviceEvents() {
        Set<TypedTuple<String>> allEvents = redisService.getAllEvents();

        return allEvents.stream()
                .map(tuple -> {

                    String[] split =
                            tuple.getValue().split(":", 2);

                    OffsetDateTime createdAt =
                            Instant.ofEpochMilli(
                                            tuple.getScore().longValue()
                                    )
                                    .atZone(ZoneId.of("Asia/Seoul"))
                                    .toOffsetDateTime();

                    return RedisEventResponse.of(split[0],
                            split[1],
                            createdAt

                    );
                })
                .toList();
    }



}
