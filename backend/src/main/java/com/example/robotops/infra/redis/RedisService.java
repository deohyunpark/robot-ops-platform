package com.example.robotops.infra.redis;

import com.example.robotops.domain.request.DeviceStateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JsonUtil jsonUtil;

    // 최신 상태 + lastSeen 저장
    public void saveState(DeviceStateRequest req) {

        String key = "device:" + req.deviceId() + ":state";

        stringRedisTemplate.opsForValue().set(key, jsonUtil.toJson(req));

        stringRedisTemplate.opsForValue()
                .set("device:" + req.deviceId() + ":lastSeen",
                        String.valueOf(System.currentTimeMillis()));
    }
}
