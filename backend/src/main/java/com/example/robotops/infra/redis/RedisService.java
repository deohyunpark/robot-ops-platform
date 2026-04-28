package com.example.robotops.infra.redis;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.request.DeviceStateRequest;
import java.time.Duration;
import java.util.List;
import java.util.Set;
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

    public Set<String> getOfflineDeviceList(long threshold) {
        String key = RedisKey.DEVICE_LAST_SEEN_ZSET.key();
        return stringRedisTemplate.opsForZSet()
                .rangeByScore(key, 0, threshold);
    }

    public Double getHeartbeat(String deviceId) {
        String key = RedisKey.DEVICE_LAST_SEEN_ZSET.key();
        return stringRedisTemplate.opsForZSet().score(key, deviceId);
    }

    public void deleteOfflineDevice(String deviceId) {
        String key = RedisKey.DEVICE_LAST_SEEN_ZSET.key();
        stringRedisTemplate.opsForZSet().remove(key, deviceId);
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

    // duration 수정
    public void updateEvent(DeviceEvent deviceEvent) {
        String key = RedisKey.DEVICE_EVENT.key(deviceEvent.getDeviceId(), deviceEvent.getEventType().name());

        stringRedisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofMinutes(5));
    }

    public boolean tryAcquire(DeviceEvent event) {
        String key = RedisKey.DEVICE_EVENT.key(
                event.getDeviceId(),
                event.getEventType().name()
        );

        Boolean success = stringRedisTemplate.opsForValue()
                .setIfAbsent(key, "1", Duration.ofMinutes(5));

        return Boolean.TRUE.equals(success);
    }
}
