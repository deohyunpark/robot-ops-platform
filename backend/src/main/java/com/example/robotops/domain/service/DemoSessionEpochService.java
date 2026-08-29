package com.example.robotops.domain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DemoSessionEpochService {

    public static final String CURRENT_EPOCH_KEY = "demo:session:currentEpoch";

    private final StringRedisTemplate redisTemplate;

    /** 데모 시작 시 epoch 를 올리고, 새 세션 값을 반환한다. */
    public String beginSession() {
        Long epoch = redisTemplate.opsForValue().increment(CURRENT_EPOCH_KEY);
        return String.valueOf(epoch);
    }

    /**
     * 데모 정지 시 epoch 를 한 번 더 올려, 직전 세션에서 발행된 in-flight Kafka 메시지를 무효화한다.
     */
    public String invalidateSession() {
        Long epoch = redisTemplate.opsForValue().increment(CURRENT_EPOCH_KEY);
        return String.valueOf(epoch);
    }

    public String getCurrentEpoch() {
        String epoch = redisTemplate.opsForValue().get(CURRENT_EPOCH_KEY);
        return epoch != null ? epoch : "0";
    }

    public boolean isActiveEpoch(String messageEpoch) {
        if (messageEpoch == null || messageEpoch.isBlank()) {
            return false;
        }
        return messageEpoch.equals(getCurrentEpoch());
    }
}
