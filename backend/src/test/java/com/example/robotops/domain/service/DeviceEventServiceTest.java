package com.example.robotops.domain.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
import org.junit.jupiter.api.Assertions;
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
    @DisplayName("dedup 통과 시 DB 저장 후 feed 등록 및 Kafka 발행")
    void process_whenDedupAcquires_savesRegistersAndPublishes() {
        DeviceEvent event = DeviceEvent.of(
                "robot-001",
                EventType.OFFLINE,
                Severity.CRITICAL,
                Map.of("ts", "2026-05-21T12:00:00+09:00")
        );
        when(redisService.acquireEventDedup(event)).thenReturn(true);
        when(deviceEventRepository.save(event)).thenReturn(event);

        deviceEventService.process(event);

        verify(redisService).acquireEventDedup(event);
        verify(deviceEventRepository).save(event);
        verify(redisService).registerEventInFeed(event);
        verify(kafkaProducer).sendAllEvents("robot-001");
        verify(redisService, never()).releaseEventDedup(any());
    }

    @Test
    @DisplayName("dedup 차단 시 DB/Kafka/feed 등록 없음")
    void process_whenDedupBlocks_skipsPersistAndPublish() {
        DeviceEvent event = DeviceEvent.of(
                "robot-002",
                EventType.LOW_BATTERY,
                Severity.CRITICAL,
                Map.of()
        );
        when(redisService.acquireEventDedup(event)).thenReturn(false);

        deviceEventService.process(event);

        verify(redisService).acquireEventDedup(event);
        verify(deviceEventRepository, never()).save(any());
        verify(redisService, never()).registerEventInFeed(any());
        verify(kafkaProducer, never()).sendAllEvents(any());
        verify(redisService, never()).releaseEventDedup(any());
    }

    @Test
    @DisplayName("DB 저장 실패 시 Redis dedup 키를 되돌린다")
    void process_whenDbSaveFails_releasesDedupKey() {
        DeviceEvent event = DeviceEvent.of(
                "robot-003",
                EventType.OFFLINE,
                Severity.CRITICAL,
                Map.of()
        );
        when(redisService.acquireEventDedup(event)).thenReturn(true);
        doThrow(new RuntimeException("db down"))
                .when(deviceEventRepository)
                .save(event);

        Assertions.assertThrows(RuntimeException.class, () -> deviceEventService.process(event));

        verify(redisService).releaseEventDedup(event);
        verify(redisService, never()).registerEventInFeed(any());
        verify(kafkaProducer, never()).sendAllEvents(any());
    }
}
