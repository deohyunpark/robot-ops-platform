[    Test worker] c.e.r.d.service.DevicePriorityService    : Query execution started createPriorityResponse : RBT-0001
2026-08-11T19:46:11.125+09:00 DEBUG 4610 --- [robotops] [    Test worker] org.hibernate.SQL                        : select 1 from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=? and de1_0.severity=? fetch first ? rows only
Hibernate: select 1 from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=? and de1_0.severity=? fetch first ? rows only
2026-08-11T19:46:11.125+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [RBT-0001]
2026-08-11T19:46:11.125+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (2:VARCHAR) <- [OPEN]
2026-08-11T19:46:11.125+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (3:VARCHAR) <- [CRITICAL]
2026-08-11T19:46:11.125+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (4:INTEGER) <- [1]
2026-08-11T19:46:11.126+09:00 DEBUG 4610 --- [robotops] [    Test worker] org.hibernate.SQL                        : select max(de1_0.created_at) from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=?
Hibernate: select max(de1_0.created_at) from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=?
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [RBT-0001]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (2:VARCHAR) <- [OPEN]
2026-08-11T19:46:11.126+09:00 DEBUG 4610 --- [robotops] [    Test worker] org.hibernate.SQL                        : select de1_0.id,de1_0.created_at,de1_0.device_id,de1_0.event_status,de1_0.event_type,de1_0.payload,de1_0.resolved_at,de1_0.severity from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=? order by case when (de1_0.severity=?) then ? when (de1_0.severity=?) then ? else 3 end,de1_0.created_at desc fetch first ? rows only
Hibernate: select de1_0.id,de1_0.created_at,de1_0.device_id,de1_0.event_status,de1_0.event_type,de1_0.payload,de1_0.resolved_at,de1_0.severity from device_event de1_0 where de1_0.device_id=? and de1_0.event_status=? order by case when (de1_0.severity=?) then ? when (de1_0.severity=?) then ? else 3 end,de1_0.created_at desc fetch first ? rows only
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [RBT-0001]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (2:VARCHAR) <- [OPEN]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (3:VARCHAR) <- [CRITICAL]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (4:INTEGER) <- [1]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (5:VARCHAR) <- [WARNING]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (6:INTEGER) <- [2]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (7:INTEGER) <- [1]
2026-08-11T19:46:11.126+09:00 DEBUG 4610 --- [robotops] [    Test worker] org.hibernate.SQL                        : select aa1_0.id,aa1_0.created_at,aa1_0.current_situation,aa1_0.possible_cause,aa1_0.recommendation,aa1_0.risk_level,aa1_0.risk_score,aa1_0.robot_id from ai_analysis aa1_0 where aa1_0.robot_id=? and aa1_0.risk_score>=? and aa1_0.risk_level=? order by aa1_0.created_at desc fetch first ? rows only
Hibernate: select aa1_0.id,aa1_0.created_at,aa1_0.current_situation,aa1_0.possible_cause,aa1_0.recommendation,aa1_0.risk_level,aa1_0.risk_score,aa1_0.robot_id from ai_analysis aa1_0 where aa1_0.robot_id=? and aa1_0.risk_score>=? and aa1_0.risk_level=? order by aa1_0.created_at desc fetch first ? rows only
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (1:VARCHAR) <- [RBT-0001]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (2:INTEGER) <- [80]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (3:VARCHAR) <- [HIGH]
2026-08-11T19:46:11.126+09:00 TRACE 4610 --- [robotops] [    Test worker] org.hibernate.orm.jdbc.bind              : binding parameter (4:INTEGER) <- [1]
2026-08-11T19:46:11.127+09:00  INFO 4610 --- [robotops] [    Test worker] c.e.r.d.service.DevicePriorityService    : Query execution completed createPriorityResponse: RBT-0001
-- 초기 테스트 데이터 업

# Device Priority Query N+1 Optimization

## 문제

우선순위 장비 조회 시 장비 수에 비례하여 추가 쿼리가 발생했다.

## 테스트 환경

- Warm-up: 10회
- Test: 100회
- EntityManager clear: 매 반복마다 수행

## 개선 전

| 항목 | 결과 |
|---|---:|
| Device Count | 30 |
| Query Count | 31 |
| Average | 00 ms |
| P95 | 00 ms |

## 원인

...

## 개선

Fetch Join / EntityGraph / Batch Size 등 실제 적용한 방법 작성

## 개선 후

| 항목 | Before | After |
|---|---:|---:|
| Query Count | 31 | 1 |
| Average | 00 ms | 00 ms |
| P95 | 00 ms | 00 ms |

## 결과

쿼리 수를 31회에서 1회로 감소시켰고,
평균 조회 시간을 약 XX% 개선했다.