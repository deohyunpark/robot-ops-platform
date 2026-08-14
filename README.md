# 🤖 Robot Ops Platform

> 실시간 로봇 텔레메트리를 수집·분석하고,
> 이상 상황 탐지부터 운영자 조치까지 지원하는
> AI 기반 Fleet Operations Platform


![Robot Ops Demo](./docs/images/4.11.34.gif)

## 🎯 Project Goal

다수의 로봇을 운영하는 환경에서는 단순히 현재 상태를 확인하는 것보다

- 어떤 장비에 문제가 발생했는지
- 어떤 문제를 가장 먼저 확인해야 하는지
- 왜 문제가 발생했는지
- 운영자가 어떤 조치를 해야 하는지

를 빠르게 판단하는 것이 중요합니다.

Robot Ops Platform은 이러한 운영 흐름을

**탐지 → 분석 → 우선순위 판단 → 운영자 조치 → 해결**

까지 하나의 시스템에서 지원하는 것을 목표로 
MQTT → Kafka → Redis/PostgreSQL → WebSocket 기반의
실시간 데이터 파이프라인을 구성하고,
이벤트 탐지, Risk Score 계산, AI 분석, 운영 대응 Workflow,
일일 PDF 리포트까지 구현했습니다.

## 주요 기능

- **실시간 모니터링 대시보드** — 로봇 상태, 이벤트, 가동률, 처리량을 WebSocket(STOMP)으로 실시간 갱신
- **플릿 이벤트 관리** — CRITICAL 장애 이벤트 우선 표시, 디바이스별 이벤트 타임라인
- **Daisy Assistant** — OpenAI 기반 자연어 질의응답 (운영 현황, 이벤트 분석, 일일 리포트 요약)
- **일일 운영 PDF 리포트** — KPI, 처리량, 이벤트, AI 인사이트를 포함한 PDF 생성 (한글 폰트 지원)
- **데모 시뮬레이터** — MQTT로 가상 로봇 텔레메트리를 발행하여 데모·개발 환경 구성
- **관측(Observability)** — Prometheus + Grafana로 백엔드 메트릭 수집

## ✨ Core Features

### 실시간 Fleet Monitoring

- MQTT 기반 로봇 Telemetry 수집
- Redis 기반 최신 Device State 관리
- WebSocket(STOMP)을 통한 실시간 Dashboard 갱신
- 배터리, 온도, CPU, 속도, 위치, Mission 상태 표시

### Event Detection

다음 이상 이벤트를 탐지합니다.

- OFFLINE
- LOW_BATTERY
- OVERHEAT
- EMERGENCY_STOP
- COLLISION
- OBSTACLE
- CPU_RISING
- TEMP_RISING
- SPEED_RISING
- IDLE
- CHARGING

Redis 기반 중복 방지 로직을 적용하여
동일 이벤트의 반복 생성을 억제합니다.

### Risk-based Priority

운영자가 먼저 확인해야 할 장비를 다음 정책으로 정렬합니다.

1. 해결되지 않은 CRITICAL 이벤트 존재 여부
2. Risk Score
3. 최근 이벤트 발생 시간

### AI Insight

Telemetry와 탐지된 Insight를 기반으로

- 현재 상황
- 가능한 원인
- 권장 조치

를 AI가 생성합니다.

### Operator Action Workflow

이벤트 발생 이후 단순 알림으로 끝나지 않고

OPEN
→ ACKNOWLEDGED
→ 체크리스트 수행
→ 상태 재확인
→ RESOLVED

흐름으로 운영 조치를 관리합니다.

### Daisy Assistant

Spring AI Tool Calling을 활용하여
실제 Redis/PostgreSQL 데이터를 조회하고 자연어 질문에 답변합니다.

### Daily Operations Report

운영 KPI, 생산량, 가동률, 이벤트,
위험 장비, AI 분석을 종합하여 PDF 보고서를 생성합니다.

flowchart LR

    SIM[Robot Simulator] -->|MQTT| MQTT[Mosquitto]

    MQTT --> INGEST[Mqtt Ingestor]

    INGEST --> KAFKA[Kafka]

    KAFKA --> STATE[State Consumer]
    KAFKA --> EVENT[Event Processor]
    KAFKA --> MISSION[Mission Processor]

    STATE --> REDIS[(Redis)]
    STATE --> DB[(PostgreSQL)]

    EVENT --> RULE[Rule Engine]
    RULE --> INSIGHT[Insight Analyzer]
    INSIGHT --> AI[OpenAI]

    EVENT --> DB
    INSIGHT --> DB

    REDIS --> WS[WebSocket]
    EVENT --> WS
    INSIGHT --> WS

    WS --> FRONT[React Dashboard]

    FRONT --> DAISY[Daisy Assistant]
    DAISY --> TOOL[Spring AI Tools]
    TOOL --> REDIS
    TOOL --> DB

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Spring Boot 3.5, Java 17, Spring AI (OpenAI) |
| Database | PostgreSQL 16 |
| Cache / Pub-Sub | Redis 7 |
| Message Queue | Apache Kafka 3.7 |
| IoT Protocol | MQTT (Eclipse Mosquitto) |
| Realtime | WebSocket + STOMP |
| PDF | OpenHTMLtoPDF + Thymeleaf |
| Container | Docker, Docker Compose, nginx |
| CI | GitHub Actions |

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, TypeScript | Fleet Dashboard |
| Backend | Spring Boot 3.5, Java 17 | API / Event Processing |
| IoT | MQTT / Mosquitto | Telemetry Ingestion |
| Streaming | Kafka 3.7 | Async Event Processing |
| Realtime State | Redis 7 | Device State / Dedup / KPI |
| Persistence | PostgreSQL 16 | Event / Telemetry History |
| Realtime UI | WebSocket + STOMP | Push Updates |
| AI | Spring AI + OpenAI | Insight / Assistant |
| Monitoring | Prometheus + Grafana | Observability |
| PDF | Thymeleaf + OpenHTMLToPDF | Daily Report |
| Infra | Docker Compose / nginx | Runtime Environment |
| CI | GitHub Actions | Build / Test |

## 🤔 Why These Technologies?

### Why MQTT?

로봇과 서버 간 Telemetry 전달은
작은 메시지가 지속적으로 발생하는 구조이므로
경량 IoT 메시징 프로토콜인 MQTT를 사용했습니다.

### Why Kafka?

초기에는 MQTT 수신 시 DB 저장, 상태 갱신,
이벤트 분석을 직접 처리할 수 있었지만
수신 로직과 후속 처리의 결합도가 높아집니다.

Kafka를 중간 Event Stream으로 사용하여

- Telemetry 수신
- DB 저장
- 상태 갱신
- Event 분석

책임을 분리했습니다.

### Why Redis?

관제 화면은 과거 이력보다
"현재 장비 상태"를 매우 빈번하게 조회합니다.

따라서

Redis
→ 최신 Device State
→ Heartbeat
→ Event Deduplication
→ Throughput / Utilization

PostgreSQL
→ Telemetry History
→ Device Event
→ AI Analysis

로 역할을 분리했습니다.

## 🚨 Event & Insight Engine
Telemetry
↓
Event Rule
↓
DeviceEvent
↓
Insight Rule
↓
Risk Score
↓
AI Analysis
## 프로젝트 구조

```
robot-ops-platform/
├── frontend/          # React SPA (Vite)
├── backend/           # Spring Boot API 서버
├── simulator/         # MQTT 로봇 텔레메트리 시뮬레이터 (Python)
└── infra/             # Docker Compose, Prometheus, Grafana 설정
    ├── docker-compose.yml
    ├── prometheus/
    └── grafana/
```

## 사전 요구사항

- **Docker Compose 실행**: Docker Desktop (또는 Docker Engine + Compose v2)
- **로컬 개발**:
  - Node.js 22+
  - Java 17+
  - Gradle (또는 `./backend/gradlew` 사용)
  - PostgreSQL, Redis, MQTT, Kafka (Docker Compose로 기동 가능)
- **Daisy AI / PDF 리포트**: [OpenAI API Key](https://platform.openai.com/) 필요

## 빠른 시작 (Docker Compose)

전체 스택을 한 번에 실행합니다.

```bash
cd infra

# 환경 변수 파일 생성
# infra/.env 파일을 직접 만들고 아래 값을 설정하세요:
# OPENAI_API_KEY=sk-...
# NGROK_AUTHTOKEN=...  # ngrok 터널 사용 시 (선택)

docker compose up -d --build
```

### 서비스 접속 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | 모니터링 대시보드 |
| Backend API | http://localhost:8080 | REST API |
| Kafka UI | http://localhost:8081 | Kafka 관리 UI |
| RedisInsight | http://localhost:5540 | Redis GUI |
| Prometheus | http://localhost:9090 | 메트릭 |
| Grafana | http://localhost:3001 | 대시보드 (admin / admin) |
| ngrok Inspector | http://localhost:4040 | 외부 공유 터널 (선택) |

### 데모 시뮬레이터 실행

가상 로봇 30대가 MQTT로 텔레메트리를 발행합니다.

```bash
cd infra
docker compose --profile demo up -d simulator
```

또는 대시보드/API에서 데모 세션을 시작할 수 있습니다.

```bash
curl -X POST http://localhost:8080/v1/demo/start
curl http://localhost:8080/v1/demo/status
curl -X POST http://localhost:8080/v1/demo/stop
```

### Docker Compose 서비스 구성

| 컨테이너 | 포트 | 역할 |
|----------|------|------|
| `frontend` | 3000 → 80 | nginx 정적 파일 + API/WebSocket 프록시 |
| `backend` | 8080 | Spring Boot API |
| `db` | 5432 | PostgreSQL |
| `redis` | 6379 | 캐시 / 실시간 이벤트 |
| `mqtt` | 1883 | Mosquitto 브로커 |
| `kafka` | 9092 | 이벤트 스트리밍 |
| `simulator` | — | MQTT 로봇 시뮬레이터 (`demo` 프로필) |
| `prometheus` | 9090 | 메트릭 수집 |
| `grafana` | 3001 | 시각화 |
| `ngrok` | 4040 | 외부 HTTPS 터널 (선택) |

## 로컬 개발

인프라는 Docker로, 앱은 로컬에서 실행하는 방식을 권장합니다.

### 1. 인프라 기동

```bash
cd infra
docker compose up -d db redis mqtt kafka
```

### 2. Backend 실행

```bash
cd backend

export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/robotops
export SPRING_DATASOURCE_USERNAME=app
export SPRING_DATASOURCE_PASSWORD=app
export SPRING_DATA_REDIS_HOST=localhost
export SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export MQTT_BROKER_URL=tcp://localhost:1883
export OPENAI_API_KEY=sk-...

./gradlew bootRun
```

백엔드: http://localhost:8080

### 3. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드: http://localhost:5173

Vite 개발 서버는 `/v1`, `/api`, `/ws` 요청을 `localhost:8080`으로 프록시합니다 (`vite.config.ts`).

### 4. (선택) 시뮬레이터

```bash
cd simulator
pip install paho-mqtt redis
python robot_sim.py --host localhost --port 1883 --robots 30
```

## Frontend

React + TypeScript 기반 SPA입니다. `RoboticsMonitoringDashboard`가 핵심 화면이며, Daisy 챗, PDF 다운로드, 실시간 플릿 테이블 등을 포함합니다.

```bash
cd frontend
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

### Frontend 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `VITE_API_BASE_URL` | `""` (빈 문자열) | API 베이스 URL. 비우면 현재 호스트 기준 상대 경로 사용 |
| `VITE_WS_URL` | 자동 | WebSocket URL. 미설정 시 `ws(s)://{host}/ws` |

로컬 개발 시 별도 설정 없이 Vite 프록시를 사용합니다. 프로덕션 Docker 환경에서는 nginx가 `/v1`, `/api`, `/ws`를 backend로 프록시합니다.

## Backend

Spring Boot 기반 REST API + WebSocket 서버입니다.

```bash
cd backend
./gradlew bootRun          # 실행
./gradlew test             # 테스트
./gradlew compileJava      # 컴파일만
```

### Backend 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://db:5432/robotops` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `app` | DB 사용자 |
| `SPRING_DATASOURCE_PASSWORD` | `app` | DB 비밀번호 |
| `SPRING_DATA_REDIS_HOST` | `redis` | Redis 호스트 |
| `SPRING_DATA_REDIS_PORT` | `6379` | Redis 포트 |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Kafka 브로커 |
| `MQTT_BROKER_URL` | `tcp://mqtt:1883` | MQTT 브로커 URL |
| `OPENAI_API_KEY` | — | OpenAI API 키 (Daisy, AI 분석, PDF 요약) |

### 주요 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/v1/dashboard/utilization` | 가동률 |
| `GET` | `/v1/dashboard/throughput` | 처리량 |
| `GET` | `/v1/dashboard/offline` | 오프라인 디바이스 |
| `GET` | `/v1/dashboard/all-events` | 전체 이벤트 |
| `GET` | `/v1/dashboard/device-list` | 디바이스 목록 |
| `GET` | `/v1/dashboard/feed` | AI 인사이트 피드 |
| `GET` | `/v1/dashboard/events/{robotId}` | 디바이스별 이벤트 |
| `POST` | `/v1/daisy/chat` | Daisy Assistant 채팅 |
| `POST` | `/v1/daisy/daily/report` | 일일 운영 PDF 다운로드 |
| `POST` | `/v1/demo/start` | 데모 세션 시작 |
| `POST` | `/v1/demo/stop` | 데모 세션 종료 |
| `GET` | `/v1/demo/status` | 데모 상태 조회 |
| `GET` | `/actuator/health` | 헬스체크 |
| `GET` | `/actuator/prometheus` | Prometheus 메트릭 |

### WebSocket (STOMP)

- **연결 엔드포인트**: `/ws`
- **구독 토픽** (`/robot` prefix):
  - `/robot/device/state` — 디바이스 상태
  - `/robot/device/events` — 플릿 이벤트
  - `/robot/device/throughput` — 처리량
  - `/robot/device/totalUtilization` — 전체 가동률
  - `/robot/device/offline` — 오프라인 알림
  - `/robot/device/feed` — AI 인사이트 피드

### 데이터 흐름 (개요)

```
로봇/시뮬레이터
    │ MQTT (telemetry)
    ▼
Backend (MqttIngestor)
    │ 저장 / 분석
    ├── PostgreSQL (이력)
    ├── Redis (실시간 상태·이벤트)
    ├── Kafka (이벤트 스트리밍)
    └── WebSocket → Frontend (실시간 UI)
```

## Docker 이미지 빌드

각 서비스는 멀티스테이지 Dockerfile로 빌드됩니다.

```bash
# Frontend: Node 22 빌드 → nginx:alpine
docker build -t robotops-frontend ./frontend

# Backend: Gradle 8.8 + JDK 17 빌드 → Temurin 17 JRE
docker build -t robotops-backend ./backend

# Simulator: Python MQTT 시뮬레이터
docker build -t robotops-simulator ./simulator
```

프로덕션 Frontend nginx는 SPA 라우팅(`try_files`)과 함께 `/api/`, `/v1/`, `/ws`를 backend 컨테이너(`backend:8080`)로 프록시합니다.

## CI/CD

`.github/workflows/ci.yml`에서 다음을 실행합니다.

- **Backend Test** — PostgreSQL, Redis, MQTT 서비스 위에서 `./gradlew test`
- **Frontend Build** — `npm ci && npm run build`
- **Docker Build** — `backend`, `frontend`, `simulator` 이미지 빌드 검증

`main`, `develop` 브랜치 push 및 `main` 대상 PR에서 트리거됩니다.

## 트러블슈팅

| 증상 | 확인 사항 |
|------|-----------|
| 대시보드 데이터 없음 | `simulator` 또는 `/v1/demo/start`로 텔레메트리 발행 여부 확인 |
| Daisy 응답 없음 | `OPENAI_API_KEY` 설정 및 네트워크 확인 |
| WebSocket 연결 실패 | backend 8080 기동 여부, nginx `/ws` Upgrade 헤더 확인 |
| PDF 한글 깨짐 | `backend/src/main/resources/fonts/` Noto Sans KR 폰트 포함 여부 확인 |
| DB 연결 실패 | PostgreSQL 컨테이너 기동 및 `SPRING_DATASOURCE_*` 값 확인 |

## 라이선스

내부/데모 프로젝트입니다. 세부 라이선스는 저장소 관리자에게 문의하세요.

1. Simulator가 MQTT Telemetry 발행

2. MqttIngestor가 메시지 수신

3. Kafka Topic으로 Telemetry 전달

4. Consumer 처리
   ├─ PostgreSQL → 이력 저장
   ├─ Redis → 최신 상태 저장
   ├─ Throughput 계산
   └─ Utilization 계산

5. Rule Engine
   └─ 이벤트 탐지

6. Insight Analyzer
   ├─ Risk Score 계산
   └─ OpenAI 분석

7. WebSocket
   └─ Dashboard 실시간 Push