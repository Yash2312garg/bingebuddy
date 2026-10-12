import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ──────────────────────────────────────────
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const loginLatency = new Trend('login_latency');
const failureRate = new Rate('failure_rate');

// ── Target Configuration ────────────────────────────────────
// Ingress runs on localhost:80 (or localhost:8080 via port-forward)
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:80';
const LOGIN_ENDPOINT = '/auth/v1/restaurant/login';

// ── Test Options: Ramping Concurrency (Breakpoint / Stress) ─
export const options = {
  stages: [
    { duration: '20s', target: 20 },   // Stage 1: Warm-up baseline (20 VUs)
    { duration: '30s', target: 50 },   // Stage 2: Light concurrency (50 VUs)
    { duration: '45s', target: 100 },  // Stage 3: Moderate concurrency (100 VUs)
    { duration: '45s', target: 200 },  // Stage 4: Heavy concurrency (200 VUs - bcrypt saturation zone)
    { duration: '45s', target: 350 },  // Stage 5: Stress / Breakpoint search (350 VUs)
    { duration: '45s', target: 500 },  // Stage 6: Extreme concurrency (500 VUs - failure ceiling)
    { duration: '20s', target: 0 },    // Stage 7: Ramp-down to 0
  ],
  thresholds: {
    // Breakpoint definition: Stop/fail if error rate exceeds 15%
    http_req_failed: ['rate<0.15'],
    // 95% of requests should respond within 2500ms
    http_req_duration: ['p(95)<2500'],
  },
};

export default function () {
  // Generate a distinct email per Virtual User & iteration
  // Ensures every request triggers full bcrypt hashing (10 rounds) & bypasses 60s cooldown
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}`;
  const payload = JSON.stringify({
    email: `loadtest_${uniqueId}@bingebuddy.test`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Host': 'bingebuddy.local',
    },
    timeout: '10s', // 10s socket timeout before marking as gateway timeout
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}${LOGIN_ENDPOINT}`, payload, params);
  const duration = Date.now() - startTime;

  loginLatency.add(duration);

  // Validate response
  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'has success message': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'latency under 2500ms': (r) => r.timings.duration < 2500,
  });

  if (isSuccess) {
    successfulLogins.add(1);
    failureRate.add(0);
  } else {
    failedLogins.add(1);
    failureRate.add(1);
  }

  // 100ms think time between requests to simulate realistic client interaction
  sleep(0.1);
}
