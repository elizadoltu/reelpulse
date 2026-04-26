# ReelPulse — Load Test Report

> **Target environment:** GCP Cloud Run — `europe-west1`
> **Service under test:** `service-a` — `https://service-a-450862754402.europe-west1.run.app`
> **Tool:** [k6](https://k6.io) v0.x
> **Date:** 2026-04-26
> **Branch:** `reel-45-reel-46-reel-47-reel-48`

---

## 1. Test Suite Overview

Two independent k6 scripts exercise complementary parts of the analytics pipeline:

| Script | Goal | Endpoint coverage |
|---|---|---|
| `analytics-load.js` | Read-path throughput under ramp + spike | `GET /health`, `GET /movies`, `GET /movies/:id`, `GET /movies/:id/comments` |
| `reviews-load.js` | Write-path throughput, rate-limit backpressure, end-to-end review latency | `POST /login`, `POST /movies/:id/reviews`, `GET /movies/:id/reviews/:id/status` |

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

### 2.2 Thresholds (pass/fail criteria)

| Metric | Threshold | Result |
|---|---|---|
| `http_req_duration` p(95) | `< 2 000 ms` | ✅ PASS |
| `http_req_failed` rate | `< 5 %` | ❌ FAIL — see note below |
| `http_req_duration{name:getMovies}` p(95) | `< 2 000 ms` | ✅ PASS |
| `http_req_duration{name:getMovie}` p(95) | `< 2 000 ms` | ✅ PASS |
| `http_req_duration{name:getComments}` p(95) | `< 2 000 ms` | ✅ PASS |

> **Note on `http_req_failed` (44.85%):** The hardcoded sample movie IDs used in the test do not all exist in the production database — most `GET /movies/:id` and `GET /movies/:id/comments` calls returned `404 Not Found`. k6's default response callback counts any non-2xx as a failure; however, 404 is the correct, expected response for an unknown movie ID (both checks passed 100%). The script has been updated to add `http.setResponseCallback(http.expectedStatuses({min:200,max:299}, 404))` so future runs will not count 404s as failures. No actual server errors (5xx) occurred.

### 2.3 Results

#### HTTP Request Volume

| Metric | Value |
|---|---|
| Total requests | 8 322 |
| Requests / sec (avg) | 54.7 req/s |
| Failed requests (incl. expected 404s) | 3 733 (44.85 %) |
| Server errors (5xx) | 0 |
| Completed iterations | 2 080 |

#### Latency — All Endpoints

| Percentile | Latency |
|---|---|
| p(50) median | 61.23 ms |
| p(90) | 107.41 ms |
| p(95) | 132.84 ms |
| max | 388.29 ms |

#### Latency by Endpoint

| Endpoint | p(50) | p(95) |
|---|---|---|
| `GET /health` | — | — |
| `GET /movies` | 66.61 ms | 135.37 ms |
| `GET /movies/:id` | 59.93 ms | 133.77 ms |
| `GET /movies/:id/comments` | 59.76 ms | 132.79 ms |

#### Data Transfer

| Metric | Value |
|---|---|
| Data received | 55 MB |
| Data sent | 1.2 MB |

#### Virtual Users

| Metric | Value |
|---|---|
| Peak VUs | 100 |
| VU ramp behaviour | Smooth — no connection errors during spike |

### 2.4 Observations

- All four latency thresholds passed by a wide margin: p(95) stayed at ~133 ms even at 100 VUs — **15× below** the 2 000 ms ceiling.
- No 5xx errors were observed across 8 322 requests and 2 080 complete iterations.
- Cloud Run handled the 100-VU spike without cold-start impact (min latency 45 ms throughout).
- The `http_req_failed` threshold failure is a test-script artefact, not a service regression: hardcoded ObjectIds produced 404s that the default k6 failure counter treats as errors. The fix (`setResponseCallback` for 404) has been applied to `analytics-load.js` for subsequent runs.
- Login was skipped (placeholder credentials supplied); auth-gated paths were not exercised in this run.

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

### 3.2 Thresholds (pass/fail criteria)

| Metric | Threshold | Result |
|---|---|---|
| `http_req_failed` rate (5xx + network) | `< 5 %` | ❌ FAIL — login credentials invalid, see note |
| `review_e2e_latency_ms` p(95) | `< 30 000 ms` | ✅ PASS (no reviews processed — 0 ms) |

> **Note:** The test run used placeholder credentials (`your@email.com` / `yourpassword`). Login returned `401 Unauthorized` immediately, so only 1 HTTP request was made (the login itself) and all VU iterations exited early. The `http_req_failed: 100%` reflects the single failed login — not a service regression. Re-run with valid credentials to exercise the write path and rate-limit backpressure.

### 3.3 Results

> **This section requires a re-run with valid credentials.** The data below cannot be populated from the current run.

#### HTTP Request Volume

| Metric | Value |
|---|---|
| Total requests | 1 (login only) |
| Successful review submissions (202) | 0 |
| Rate-limited responses (429) | 0 |
| Server errors (5xx) | 0 |

#### Rate-Limit Backpressure

The test intentionally drives traffic above the 60 req/min per-user ceiling. The chart below illustrates the expected backpressure pattern:

```
Requests/min
 90 │                  ████████████████
 60 │─────────────────── rate limit ────── (60 req/min)
 40 │        ████
  0 └──────────────────────────────────▶ time
      0 s   30 s   90 s   120 s
```

| Window | Submitted | 429s | Effective throughput |
|---|---|---|---|
| Ramp-up (0–30 s) | — | — | — |
| Sustain (30–90 s) | — | — | — |
| Ramp-down (90–120 s) | — | — | — |

#### End-to-End Review Latency

> Not available — re-run with valid credentials required.

#### Consistency Window

> Not available — re-run with valid credentials required.

### 3.4 Observations

- Rate limiting could not be exercised; a re-run with valid credentials is required.
- The `review_e2e_latency_ms` threshold technically passed only because 0 reviews were submitted (no data points recorded).

---

## 4. Infrastructure Observations

### Cloud Run Scaling

| Service | Min instances | Max instances observed | Cold-start impact |
|---|---|---|---|
| `service-a` | 1 | — | None observed (min latency 45 ms at peak 100 VUs) |

### PubSub Pipeline Throughput

| Stage | Observed lag |
|---|---|
| `POST /reviews` → Pub/Sub publish | not tested (login failed) |
| Pub/Sub → cf-review-analyzer trigger | not tested |
| Gemini analysis | not tested |
| Firestore write | not tested |
| Pub/Sub → notification-service WS | not tested |

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

## 6. Known Limitations & Next Steps

| Item | Detail |
|---|---|
| 404 false-positives (analytics) | Fixed in `analytics-load.js` via `setResponseCallback`. Re-run to get a clean `http_req_failed` result. |
| Reviews test | Re-run with valid account credentials to exercise the write path and rate-limit logic. |
| Movie ID pool | Current hardcoded IDs are `sample_mflix` ObjectIds; many do not exist in the production DB. Fetch real IDs in `setup()` from `GET /movies?page=1` for a more representative run. |
| Analytics data (dashboard) | cf-analytics reads BigQuery `movie_views`. The `analyticsprocessor` Cloud Function (Pub/Sub → BigQuery writer) must be deployed and triggered to populate trending data. |

---

## 7. Glossary

| Term | Definition |
|---|---|
| VU | Virtual User — a simulated concurrent user running the test script |
| p(95) | 95th percentile latency — 95 % of requests completed faster than this value |
| `http_req_failed` | k6 built-in counter: requests that returned a non-2xx/3xx status or timed out |
| `review_e2e_latency_ms` | Custom metric: ms from review POST start to Firestore `status: processed` |
| `review_consistency_window_ms` | Custom metric: ms from 202 response to Firestore update being visible |
| 429 | HTTP Too Many Requests — rate limit enforced by `@fastify/rate-limit` |
| Consistency window | Time gap between an operation being accepted (202) and its effects being observable |
