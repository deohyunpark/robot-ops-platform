package com.example.robotops.infra.redis;

import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.request.DeviceStateRequest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final StringRedisTemplate stringRedisTemplate;
    private final JsonUtil jsonUtil;

    public  OffsetDateTime currentBucketStart() {

        OffsetDateTime now = OffsetDateTime.now();

        int minute = (now.getMinute() / 15) * 15;

        return now.withMinute(minute)
                .withSecond(0)
                .withNano(0);
    }

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

    public void countDone15Minutes() {
        String bucketKey = current15MinBucketKey();

        stringRedisTemplate.opsForValue().increment(bucketKey);

        stringRedisTemplate.expire(bucketKey, Duration.ofDays(2));

    }

    public void countDoneDaily() {
        String dailyKey = currentDailyKey();

        stringRedisTemplate.opsForValue().increment(dailyKey);

        stringRedisTemplate.expire(dailyKey, Duration.ofDays(2));
    }

    public List<String> getMultiValue(List<String> keys) {
        return stringRedisTemplate.opsForValue().multiGet(keys);
    }

    public Map<String, String> bucketLabel() {

        OffsetDateTime start = currentBucketStart();
        OffsetDateTime end = start.plusMinutes(14);

        return Map.of(
                "start", start.toInstant().toString(),
                "end", end.toInstant().toString()
        );
    }

    public String bucketKey(OffsetDateTime time) {

        return "throughput:" +
                time.format(
                        DateTimeFormatter.ofPattern("yyyy-MM-dd:HH:mm")
                );
    }

    public Map<String, Long> getThroughput() {
        Map<String, Long> throughput = new HashMap<>();

        throughput.put("current", getLong(current15MinBucketKey()));
        throughput.put("prev", getLong(prev15mKey()));
        throughput.put("today", getLong(currentDailyKey()));

        return throughput;
    }

    private long getLong(String key) {

        String value =
                stringRedisTemplate.opsForValue().get(key);

        return value == null ? 0 : Long.parseLong(value);
    }

    private String prev15mKey() {

        OffsetDateTime current = currentBucketStart();

        OffsetDateTime prev = current.minusMinutes(15);

        return bucketKey(prev);
    }

    public String currentDailyKey() {
        LocalDate today = LocalDate.now();

        return "throughput:daily:" +
                today.format(DateTimeFormatter.ISO_DATE);
    }

    public String current15MinBucketKey() {
        return "throughput:" +
                currentBucketStart().format(
                        DateTimeFormatter.ofPattern("yyyy-MM-dd:HH:mm"));
    }

    public String current15MinBucketKeyByDeviceId(String deviceId) {
        return "utilization:" + deviceId + ":" +
                currentBucketStart().toInstant().toEpochMilli();
    }

    public void updateMissionTime(String deviceId, String mission, String startedAt) {
        String key = "utilization:" + deviceId;

        stringRedisTemplate.opsForHash().put(key, "mission", mission);
        stringRedisTemplate.opsForHash().put(key, "startedAt", startedAt);
    }

    public String getMissionTimeValue(String deviceId, String hashKey) {
        String key = "utilization:" + deviceId;

        return (String) stringRedisTemplate.opsForHash().get(key, hashKey);
    }

    public void updateUtilizationBucket(String deviceId, String hashKey, long duration) {
        String key = current15MinBucketKeyByDeviceId(deviceId);

        stringRedisTemplate.opsForHash().increment(key, hashKey, duration);
    }

    public Map<String, String> getUtilizationValue(String deviceId) {
        String key = current15MinBucketKeyByDeviceId(deviceId);

        Map<Object, Object> raw =
                stringRedisTemplate.opsForHash().entries(key);

        Map<String, String> result = new HashMap<>();

        for (Map.Entry<Object, Object> entry : raw.entrySet()) {
            result.put(
                    String.valueOf(entry.getKey()),
                    String.valueOf(entry.getValue())
            );
        }
        return result;
    }
}
