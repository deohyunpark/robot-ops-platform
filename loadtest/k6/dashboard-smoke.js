/**
 * Smoke test — 소량 VU로 API가 정상 응답하는지 확인
 *
 * 실행:
 *   k6 run loadtest/k6/dashboard-smoke.js
 *   BASE_URL=http://localhost:8080 k6 run loadtest/k6/dashboard-smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const utilization = http.get(`${BASE_URL}/v1/dashboard/utilization`);
  check(utilization, {
    'utilization 200': (r) => r.status === 200,
  });

  const deviceList = http.get(`${BASE_URL}/v1/dashboard/device-list`);
  check(deviceList, {
    'device-list 200': (r) => r.status === 200,
  });

  const throughput = http.get(`${BASE_URL}/v1/dashboard/throughput`);
  check(throughput, {
    'throughput 200': (r) => r.status === 200,
  });

  sleep(1);
}
