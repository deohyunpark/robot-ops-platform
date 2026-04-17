-- =====================================================
-- Robot Ops Platform - Initial Schema
-- PostgreSQL
-- =====================================================

-- -----------------------------
-- 1. 원본 수신 로그 테이블
-- MQTT로 들어온 데이터를 그대로 적재
-- -----------------------------
create table if not exists telemetry_raw (
    id              bigserial primary key,
    ts              timestamptz not null,
    site_id         varchar(100) not null,
    device_type     varchar(30) not null,
    device_id       varchar(50) not null,
    msg_id          varchar(100) not null,

    battery_pct     numeric(5,2),
    temp_c          numeric(6,2),

    raw_json        jsonb not null,

    created_at      timestamptz not null default now(),

    constraint uk_telemetry_raw unique (device_id, msg_id)
    );

create index if not exists idx_telemetry_raw_device_ts
    on telemetry_raw(device_id, ts desc);

create index if not exists idx_telemetry_raw_site_ts
    on telemetry_raw(site_id, ts desc);



-- -----------------------------
-- 2. 최신 상태 테이블
-- 로봇별 현재 상태 1줄 유지
-- -----------------------------
create table if not exists device_state (

                                            device_type     varchar(30) not null,
    device_id       varchar(100) not null,

    site_id         varchar(100) not null,

    online          boolean,
    mode            varchar(30),
    mission         varchar(50),

    battery_pct     numeric(10,2),
    speed_mps       numeric(10,3),

    pos_x           numeric(12,3),
    pos_y           numeric(12,3),
    theta           numeric(12,4),
    map_id          varchar(100),

    cpu_pct         numeric(10,2),
    mem_pct         numeric(10,2),
    temp_c          numeric(10,2),

    estop           boolean,
    bumper          boolean,
    obstacle        boolean,

    error_code      varchar(30),

    last_seq        bigint not null,
    last_seen_at    timestamptz not null,

    updated_at      timestamptz not null default now(),

    primary key (device_type, device_id)
    );

create index if not exists idx_device_state_seen
    on device_state(last_seen_at desc);


