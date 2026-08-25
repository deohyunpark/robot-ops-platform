package com.example.robotops.domain.service;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.infra.kafka.producer.KafkaProducer;
import com.example.robotops.infra.redis.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.support.TransactionSynchronization;

@Slf4j
@RequiredArgsConstructor
class DeviceEventProcessSynchronization implements TransactionSynchronization {

    private final DeviceEvent deviceEvent;
    private final RedisService redisService;
    private final KafkaProducer kafkaProducer;

    @Override
    public void afterCommit() {
        redisService.registerEventInFeed(deviceEvent);
        kafkaProducer.sendAllEvents(deviceEvent.getDeviceId());
    }

    @Override
    public void afterCompletion(int status) {
        if (status == STATUS_ROLLED_BACK) {
            redisService.releaseEventDedup(deviceEvent);
            log.debug(
                    "Released event dedup after rollback. deviceId={}, eventType={}",
                    deviceEvent.getDeviceId(),
                    deviceEvent.getEventType()
            );
        }
    }
}
