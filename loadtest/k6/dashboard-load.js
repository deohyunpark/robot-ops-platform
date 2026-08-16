/**
 * Dashboard API 부하 테스트
 *
 * 대상: Redis/DB 조회가 많은 Dashboard GET API
 * 제외: Daisy chat, PDF (OpenAI·비용·외부 API)
 *
 * 실행:
 *   k6 run loadtest/k6/dashboard-load.js
 *   BASE_URL=http://localhost:8080 k6 run loadtest/k6/dashboard-load.js
 *
 * 시나리오 변경:
 *   k6 run -e SCENARIO=spike loadtest/k6/dashboard-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const SCENARIO = __ENV.SCENARIO || 'ramp';

const utilizationDuration = new Trend('utilization_duration', true);
const deviceListDuration = new Trend('device_list_duration', true);
const allEventsDuration = new Trend('all_events_duration', true);
const errorRate = new Rate('dashboard_errors');

const scenarios = {
  ramp: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 30 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '20s', target: 10 },
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '20s', target: 10 },
      { duration: '20s', target: 0 },
    ],
  },
  soak: {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '30s', target: 0 },
    ],
  },
};

export const options = {
  scenarios: {
    dashboard: {
      executor: 'ramping-vus',
      ...scenarios[SCENARIO] || scenarios.ramp,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    utilization_duration: ['p(95)<500'],
    device_list_duration: ['p(95)<300'],
    all_events_duration: ['p(95)<300'],
    dashboard_errors: ['rate<0.05'],
  },
};

function record(res, trend, label) {
  const ok = res.status === 200;
  errorRate.add(!ok);
  if (ok) {
    trend.add(res.timings.duration);
  }
  check(res, { [`${label} 200`]: (r) => r.status === 200 });
}

export default function () {
  // utilization — Redis Pipeline 구간 (README 5.4 성과 검증용)
  record(
    http.get(`${BASE_URL}/v1/dashboard/utilization`, { tags: { name: 'utilization' } }),
    utilizationDuration,
    'utilization',
  );

  record(
    http.get(`${BASE_URL}/v1/dashboard/device-list`, { tags: { name: 'device-list' } }),
    deviceListDuration,
    'device-list',
  );

  record(
    http.get(`${BASE_URL}/v1/dashboard/all-events`, { tags: { name: 'all-events' } }),
    allEventsDuration,
    'all-events',
  );

  http.get(`${BASE_URL}/v1/dashboard/throughput`, { tags: { name: 'throughput' } });
  http.get(`${BASE_URL}/v1/dashboard/offline`, { tags: { name: 'offline' } });
  http.get(`${BASE_URL}/v1/dashboard/feed`, { tags: { name: 'feed' } });

  // demo 시뮬레이터 기본 ID (RBT-0001 ~ RBT-0030)
  const robotNum = String(Math.floor(Math.random() * 30) + 1).padStart(4, '0');
  http.get(`${BASE_URL}/v1/dashboard/events/RBT-${robotNum}`, {
    tags: { name: 'events-by-robot' },
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'];
  const utilP95 = data.metrics.utilization_duration?.values?.['p(95)'];
  const failRate = data.metrics.http_req_failed?.values?.rate;

  return [
    '',
    '=== Robot Ops Dashboard Load Test ===',
    `  http p(95):        ${p95 != null ? `${p95.toFixed(2)} ms` : 'n/a'}`,
    `  utilization p(95): ${utilP95 != null ? `${utilP95.toFixed(2)} ms` : 'n/a'}`,
    `  error rate:        ${failRate != null ? `${(failRate * 100).toFixed(2)}%` : 'n/a'}`,
    '',
  ].join('\n');
}
