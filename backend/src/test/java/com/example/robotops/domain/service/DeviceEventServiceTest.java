package com.example.robotops.domain.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceEventService")
class DeviceEventServiceTest {

    @Mock
    private DeviceEventRepository deviceEventRepository;

    @Mock
    private RedisService redisService;

    @Mock
    private KafkaProducer kafkaProducer;

    @InjectMocks
    private DeviceEventService deviceEventService;

    @Test
    @DisplayName("Redis dedup 통과 시 DB 저장 후 Kafka all-events 발행")
    void process_whenRedisAcquires_savesAndPublishes() {
        // given
        DeviceEvent event = DeviceEvent.of(
                "robot-001",
                EventType.OFFLINE,
                Severity.CRITICAL,
                Map.of("ts", "2026-05-21T12:00:00+09:00")
        );
        when(redisService.tryAcquire(event)).thenReturn(true);
        when(deviceEventRepository.save(event)).thenReturn(event);

        // when
        deviceEventService.process(event);

        // then
        verify(redisService).tryAcquire(event);
        verify(deviceEventRepository).save(event);
        verify(kafkaProducer).sendAllEvents("robot-001");
    }

    @Test
    @DisplayName("Redis dedup 차단 시 DB/Kafka 호출 없음")
    void process_whenRedisBlocks_skipsPersistAndPublish() {
        // given
        DeviceEvent event = DeviceEvent.of(
                "robot-002",
                EventType.LOW_BATTERY,
                Severity.CRITICAL,
                Map.of()
        );
        when(redisService.tryAcquire(event)).thenReturn(false);

        // when
        deviceEventService.process(event);

        // then
        verify(redisService).tryAcquire(event);
        verify(deviceEventRepository, never()).save(any());
        verify(kafkaProducer, never()).sendAllEvents(any());
    }
}
