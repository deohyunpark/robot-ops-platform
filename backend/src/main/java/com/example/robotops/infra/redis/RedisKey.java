package com.example.robotops.infra.redis;

public enum RedisKey {


    DEVICE_LAST_SEEN_ZSET("device:lastSeen:zset"),

    DEVICE_STATE("device:%s:state"),

    DEVICE_EVENT("device:%s:event:%s"),
    ALL_DEVICE_EVENT("device:events"),
    UTILIZATION("utilization:total"),

    // 지표값
    METRIC("device:%s:%s"),

    // 최근 데이터 묶음
    WINDOW("device:%s:window:%s"),

    // 증가/감소 횟수
    TREND("device:%s:trend:%s"),
    ;

    private final String pattern;

    RedisKey(String pattern) {
        this.pattern = pattern;
    }

    public static RedisKey metric(String metric) {
        return METRIC;
    }

    public String key(String... args) {
        return String.format(pattern, (Object[]) args);
    }

    public String key() {
        return pattern;
    }
}
