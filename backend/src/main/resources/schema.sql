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
    pose_x          numeric(12,3),
    pose_y          numeric(12,3),

    error_code      varchar(100),

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
    device_id       varchar(50) not null,

    site_id         varchar(100) not null,

    is_online       boolean not null default true,

    battery_pct     numeric(5,2),
    temp_c          numeric(6,2),

    pose_x          numeric(12,3),
    pose_y          numeric(12,3),

    mode            varchar(30),
    mission         varchar(50),

    error_code      varchar(100),

    last_seen_at    timestamptz not null,
    updated_at      timestamptz not null default now(),

    primary key (device_type, device_id)
    );

create index if not exists idx_device_state_site
    on device_state(site_id);

create index if not exists idx_device_state_last_seen
    on device_state(last_seen_at desc);



-- -----------------------------
-- 3. 샘플 조회용 View (선택)
-- -----------------------------
create or replace view v_robot_summary as
select
    device_id,
    site_id,
    is_online,
    battery_pct,
    temp_c,
    mode,
    mission,
    error_code,
    last_seen_at
from device_state
where device_type = 'ROBOT';