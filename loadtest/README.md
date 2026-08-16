# k6 API Load Test

Robot Ops Platform Dashboard REST API 부하 테스트입니다.

## 1. k6 설치

```bash
# macOS
brew install k6

# Docker (k6 로컬 설치 없이)
docker run --rm -i grafana/k6 run - <loadtest/k6/dashboard-smoke.js
```

## 2. 서버 띄우기

```bash
cd infra
docker compose up -d --build

# 텔레메트리 데이터 (선택, utilization/events에 데이터 쌓이게)
curl -X POST http://localhost:8080/v1/demo/start
```

## 3. Smoke test (먼저 이걸로)

```bash
cd robot-ops-platform
k6 run loadtest/k6/dashboard-smoke.js
```

## 4. 부하 테스트

```bash
# 기본: 10 → 50 VU ramp
k6 run loadtest/k6/dashboard-load.js

# spike (순간 100 VU)
k6 run -e SCENARIO=spike loadtest/k6/dashboard-load.js

# soak (20 VU × 5분)
k6 run -e SCENARIO=soak loadtest/k6/dashboard-load.js

# nginx 경유 (프론트와 동일 경로)
BASE_URL=http://localhost:3000 k6 run loadtest/k6/dashboard-load.js
```

## 5. 결과 해석

| k6 출력 | 의미 |
|---------|------|
| `http_req_duration p(95)` | 전체 API 95퍼센타일 응답시간 |
| `utilization_duration p(95)` | `/utilization`만 (Redis Pipeline) |
| `http_req_failed` | 4xx/5xx 비율 |
| `vus` | 동시 가상 사용자 수 |

테스트 중 관측:

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Backend metrics: http://localhost:8080/actuator/prometheus

## 6. 주의

- **`/v1/daisy/chat`, PDF API는 부하 테스트하지 마세요** — OpenAI 비용·Rate limit
- demo 미실행 시 device-list/utilization은 빈 배열일 수 있음 (200은 나옴)
- README Redis 성과(1,000대)와 맞추려면 시뮬레이터 `ROBOTS` 수를 늘린 뒤 테스트

## 7. Docker로 k6 실행 (호스트 network)

macOS/Windows Docker Desktop:

```bash
docker run --rm -i \
  -v "$(pwd)/loadtest/k6:/scripts" \
  --add-host=host.docker.internal:host-gateway \
  grafana/k6 run \
  -e BASE_URL=http://host.docker.internal:8080 \
  /scripts/dashboard-load.js
```
