package com.example.robotops.infra.redis;

import com.example.robotops.domain.request.DeviceStateRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JsonUtil jsonUtil;

    // 디바이스 당 최신상태 저장
    public void saveState(DeviceStateRequest req) {

        stringRedisTemplate.opsForValue().set(
                RedisKey.DEVICE_STATE.key(req.deviceId()), jsonUtil.toJson(req));

    }

    // mqtt 최신 수신 시간 저장
    public void updateHeartbeat(String deviceId) {

        long now = System.currentTimeMillis();

        stringRedisTemplate.opsForZSet()
                .add(RedisKey.DEVICE_LAST_SEEN_ZSET.key(), deviceId, now);
    }

    public Long getHeartbeat(String deviceId) {

        Double score = stringRedisTemplate.opsForZSet()
                .score(RedisKey.DEVICE_LAST_SEEN_ZSET.key(), deviceId);

        return score != null ? score.longValue() : null;
    }


    public void updateMetric(String deviceId, String metric, Object value) {

        String key = RedisKey.METRIC.key(deviceId, metric);

        stringRedisTemplate.opsForValue()
                .set(key, String.valueOf(value));
    }

    public Double getMetric(String deviceId, String metric) {

        String key = RedisKey.METRIC.key(deviceId, metric);

        String value = stringRedisTemplate.opsForValue().get(key);

        return value != null ? Double.valueOf(value) : null;
    }

    public void updateWindow(String deviceId, String metric, double value) {

        String key = RedisKey.WINDOW.key(deviceId, metric);

        stringRedisTemplate.opsForList()
                .rightPush(key, String.valueOf(value));

        // todo : 쓰읍 구조바꿔야될수도
        // 최근 20개 유지
        stringRedisTemplate.opsForList()
                .trim(key, -20, -1);
    }

    public List<String> getWindow(String deviceId, String metric) {

        String key = RedisKey.WINDOW.key(deviceId, metric);

        return stringRedisTemplate.opsForList().range(key, 0, -1);
    }

    public int getCount(String deviceId, String metric) {

        String key = RedisKey.TREND.key(deviceId, metric);

        String count = stringRedisTemplate.opsForValue().get(key);

        return count != null ? Integer.parseInt(count) : 0;

    }

    public void updateCount(String deviceId, String metric, int value) {

        String key = RedisKey.TREND.key(deviceId, metric);

        stringRedisTemplate.opsForValue().set(key, String.valueOf(value));

    }


}
