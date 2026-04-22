package com.example.robotops.infra.redis;

public enum RedisKey {

    // todo
    DEVICE_LAST_SEEN_ZSET("device:lastSeen:zset"),

    DEVICE_STATE("device:%s:state"),

    // 지표값
    METRIC("device:%s:%s"),

    // 최근 데이터 묶음
    WINDOW("device:%s:%s:window"),

    // 증가/감소 횟수
    TREND("device:%s:%s:trend"),
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
