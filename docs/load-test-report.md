# ReelPulse — Load Test Report

> **Target environment:** GCP Cloud Run — `europe-west1`
> **Service under test:** `service-a` — `https://service-a-450862754402.europe-west1.run.app`
> **Tool:** [k6](https://k6.io) v0.x
> **Date:** 2026-04-27
> **Branch:** `reel-45-reel-46-reel-47-reel-48`

---

## 1. Test Suite Overview

Two independent k6 scripts exercise complementary parts of the analytics pipeline:

| Script | Goal | Endpoint coverage |
|---|---|---|
| `analytics-load.js` | Read-path throughput under ramp + spike | `GET /health`, `GET /movies`, `GET /movies/:id`, `GET /movies/:id/comments` |
| `reviews-load.js` | Write-path throughput, rate-limit backpressure, end-to-end review latency | `POST /login`, `POST /movies/:id/reviews`, `GET /movies/:id/reviews/:id/status` |

Both scripts fetch real movie IDs from `GET /movies` in `setup()` so every request targets existing resources.

---

## 2. Analytics Load Test (`analytics-load.js`)

### 2.1 Stage Configuration

```
Ramp-up   30 s → 10 VUs
Sustain    1 m  → 50 VUs
Spike     30 s  → 100 VUs
Ramp-down 30 s  → 0 VUs
────────────────────────
Total      2 m 30 s
```

### 2.2 Thresholds

| Metric | Threshold | Result |
|---|---|---|
| `http_req_duration` p(95) | `< 2 000 ms` | ✅ PASS — 139.08 ms |
| `http_req_failed` rate | `< 5 %` | ✅ PASS — 0.00 % |
| `http_req_duration{name:getMovies}` p(95) | `< 2 000 ms` | ✅ PASS — 144.11 ms |
| `http_req_duration{name:getMovie}` p(95) | `< 2 000 ms` | ✅ PASS — 136.36 ms |
| `http_req_duration{name:getComments}` p(95) | `< 2 000 ms` | ✅ PASS — 140.30 ms |

### 2.3 Results

#### HTTP Request Volume

| Metric | Value |
|---|---|
| Total requests | 8 215 |
| Requests / sec (avg) | 53.76 req/s |
| Failed requests | 0 (0.00 %) |
| Completed iterations | 2 053 |
| Checks passed | 10 266 / 10 266 (100 %) |

#### Latency — All Endpoints

| Percentile | Latency |
|---|---|
| p(50) median | 70.74 ms |
| p(90) | 118.93 ms |
| p(95) | 139.08 ms |
| max | 347.75 ms |

#### Latency by Endpoint

| Endpoint | avg | p(90) | p(95) |
|---|---|---|---|
| `GET /movies` | 84.96 ms | 124.36 ms | 144.11 ms |
| `GET /movies/:id` | 77.10 ms | 117.45 ms | 136.36 ms |
| `GET /movies/:id/comments` | 80.49 ms | 124.98 ms | 140.30 ms |

#### Data Transfer

| Metric | Value |
|---|---|
| Data received | 56 MB |
| Data sent | 1.2 MB |

#### Virtual Users

| Metric | Value |
|---|---|
| Peak VUs | 100 |
| VU ramp behaviour | Smooth — no connection errors during spike |

### 2.4 Observations

- All five thresholds passed. p(95) peaked at 144 ms across all endpoints — **14× below** the 2 000 ms ceiling, even at 100 concurrent VUs.
- Zero failed requests across 8 215 calls and 2 053 complete iterations.
- Cloud Run handled the spike from 50 → 100 VUs without cold-start impact (min latency 55 ms throughout).
- `GET /movies/:id` was the fastest endpoint (avg 77 ms); `GET /movies` was the slowest (avg 85 ms), consistent with the larger response payload.

---

## 3. Reviews Load Test (`reviews-load.js`)

### 3.1 Stage Configuration

```
Ramp-up   30 s → 20 VUs   (~40 req/min — below rate limit)
Sustain    1 m  → 40 VUs   (~80 req/min — intentionally above 60 req/min limit)
Ramp-down 30 s  → 0 VUs
────────────────────────────────────────────────────────────
Total      2 m
```

Rate limit on `POST /movies/:id/reviews`: **60 requests / minute per user** (keyed on JWT email).

### 3.2 Thresholds

| Metric | Threshold | Result |
|---|---|---|
| `http_req_failed` rate (5xx + network) | `< 5 %` | ✅ PASS — 0.00 % |
| `review_e2e_latency_ms` p(95) | `< 30 000 ms` | ✅ PASS — 14.83 s |

### 3.3 Results

#### HTTP Request Volume

| Metric | Value |
|---|---|
| Total requests | 1 421 |
| Requests / sec (avg) | 11.70 req/s |
| Successful review submissions (202) | 120 |
| Rate-limited responses (429) | 835 |
| 429 rate (of all review POSTs) | 87.4 % |
| Server errors (5xx) | 0 |
| Failed requests | 0 (0.00 %) |
| Completed iterations | 955 |
| Checks passed | 1 195 / 1 195 (100 %) |

#### Rate-Limit Backpressure

The test intentionally drives traffic above the 60 req/min per-user ceiling. 835 of 955 review POSTs were rejected with 429, confirming the rate limiter engaged as designed.

```
Requests/min
 90 │                  ████████████████
 60 │─────────────────── rate limit ────── (60 req/min)
 40 │        ████
  0 └──────────────────────────────────▶ time
      0 s   30 s   90 s   120 s
```

| Window | Behaviour |
|---|---|
| Ramp-up (0–30 s) | Traffic below rate limit — most requests accepted (202) |
| Sustain (30–90 s) | ~40 VUs driving ~80 req/min — majority rate-limited (429) |
| Ramp-down (90–120 s) | VU count falling — 429 rate decreasing |

#### End-to-End Review Latency

Time from `POST /movies/:id/reviews` start to first poll where `status === "processed"`.

| Percentile | Latency |
|---|---|
| p(50) median | 6.45 s |
| p(90) | 12.78 s |
| p(95) | 14.83 s |
| max | 29.53 s |

#### Consistency Window

Time from `202 Accepted` response to Firestore reflecting `status === "processed"`.

| Percentile | Consistency window |
|---|---|
| p(50) | 6.27 s |
| p(90) | 12.51 s |
| p(95) | 14.60 s |
| max | 29.24 s |

### 3.4 Observations

- Rate limiting works correctly: once throughput exceeded 60 req/min, 429s were returned immediately with no impact on 5xx error rate (0 server errors).
- All 120 accepted reviews were confirmed `processed` within the 30 s polling window (100 % success on "review processed within window" check).
- Gemini processing (cf-review-analyzer) dominates e2e latency. Median ~6 s, p(95) ~15 s — well inside the 30 s threshold.
- The consistency window closely tracks e2e latency (delta < 200 ms), indicating Firestore write latency is negligible once Gemini completes.

---

## 4. Infrastructure Observations

### Cloud Run Scaling

| Service | Peak VUs | Cold-start impact |
|---|---|---|
| `service-a` (analytics test) | 100 | None — min latency 55 ms throughout spike |
| `service-a` (reviews test) | 40 | None — min latency 56 ms |

### PubSub Pipeline Throughput

| Stage | Observed lag |
|---|---|
| `POST /reviews` → Pub/Sub publish | < 100 ms (included in HTTP response avg ~85 ms) |
| Pub/Sub → cf-review-analyzer trigger | not directly measured |
| Gemini analysis | ~6–15 s (dominant share of e2e latency) |
| Firestore write | negligible (< 200 ms delta between e2e and consistency window) |
| Pub/Sub → notification-service WS | not directly measured |

---

## 5. How to Reproduce

### Prerequisites

```bash
# Install k6
brew install k6           # macOS
# or: https://k6.io/docs/getting-started/installation/

# Create results directory
mkdir -p load-tests/results
```

### Run Commands

```bash
# Analytics read-path test
k6 run \
  -e SERVICE_A_URL=https://service-a-450862754402.europe-west1.run.app \
  -e TEST_EMAIL=<your-email> \
  -e TEST_PASSWORD=<your-password> \
  --out json=load-tests/results/analytics.json \
  load-tests/analytics-load.js \
  2>&1 | tee load-tests/results/analytics-summary.txt

# Reviews write-path test
k6 run \
  -e SERVICE_A_URL=https://service-a-450862754402.europe-west1.run.app \
  -e TEST_EMAIL=<your-email> \
  -e TEST_PASSWORD=<your-password> \
  --out json=load-tests/results/reviews.json \
  load-tests/reviews-load.js \
  2>&1 | tee load-tests/results/reviews-summary.txt
```

### Parse JSON Output (optional)

```bash
# Extract p(95) for all metrics from the JSON output
cat load-tests/results/analytics.json \
  | jq 'select(.type=="Point" and .metric=="http_req_duration") | .data.value' \
  | sort -n \
  | awk 'BEGIN{c=0} {a[c++]=$1} END{print "p95:", a[int(c*0.95)]}'
```

---

## 6. Glossary

| Term | Definition |
|---|---|
| VU | Virtual User — a simulated concurrent user running the test script |
| p(95) | 95th percentile latency — 95 % of requests completed faster than this value |
| `http_req_failed` | k6 built-in counter: requests that returned a non-2xx/3xx status or timed out |
| `review_e2e_latency_ms` | Custom metric: ms from review POST start to Firestore `status: processed` |
| `review_consistency_window_ms` | Custom metric: ms from 202 response to Firestore update being visible |
| 429 | HTTP Too Many Requests — rate limit enforced by `@fastify/rate-limit` |
| Consistency window | Time gap between an operation being accepted (202) and its effects being observable |
