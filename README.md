# ReelPulse

[![CI](https://github.com/elizadoltu/reelpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/elizadoltu/reelpulse/actions/workflows/ci.yml)
[![CD Backend](https://github.com/elizadoltu/reelpulse/actions/workflows/cd-backend.yml/badge.svg)](https://github.com/elizadoltu/reelpulse/actions/workflows/cd-backend.yml)
[![CD Frontend](https://github.com/elizadoltu/reelpulse/actions/workflows/cd-frontend.yml/badge.svg)](https://github.com/elizadoltu/reelpulse/actions/workflows/cd-frontend.yml)

Movie analytics and review platform built on GCP — Pub/Sub, BigQuery, Firestore, Cloud Functions, and real-time WebSockets.

## Monorepo Structure

```
reelpulse/
├── service-a/             # Fastify API: movie browsing + review submission (Cloud Run)
├── cf-analytics/          # Cloud Function #1: MovieViewedEvent → BigQuery
├── cf-review-analyzer/    # Cloud Function #2: Gemini review analysis → Firestore
├── notification-service/  # WebSocket server + Pub/Sub pull (Cloud Run)
├── frontend/              # Vite + React + TypeScript + Tailwind dashboard
├── proto/                 # gRPC proto definitions
├── load-tests/            # k6 load test scripts
├── infra/                 # GCP infrastructure setup scripts
└── README.md
```

## Prerequisites

- Node.js >= 20
- npm >= 10
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated
- [k6](https://k6.io/docs/get-started/installation/) for load tests

## Setup

```bash
# Install all workspace dependencies
npm run install:all

# Copy env file and fill in your GCP values
cp .env.example .env
```

## Development

```bash
# Start frontend + service-a + notification-service concurrently
npm run dev

# Or individually
npm run dev:frontend      # http://localhost:5173
npm run dev:service-a     # http://localhost:3001
npm run dev:notification  # http://localhost:3002
```

## Build

```bash
npm run build
```

## Testing

```bash
npm run test:run           # all workspaces
npm run test:run:frontend  # frontend only
```

## Lint & Format

```bash
npm run lint    # ESLint across all workspaces
npm run format  # Prettier across all workspaces
```

## Infrastructure

```bash
export GCP_PROJECT_ID=your-project-id
bash infra/setup.sh
```

## Load Tests

Requires [k6](https://k6.io/docs/get-started/installation/) installed.

```bash
k6 run load-tests/analytics.js
k6 run load-tests/review-submission.js
```

## Architecture

```
Browser → Service A (Fastify) → Pub/Sub (movie-events) → CF#1 → BigQuery
Browser → Service A (Fastify) → Pub/Sub (review-submitted) → CF#2 (Gemini) → Firestore
                                                                              ↓
Browser ← WebSocket ← Notification Service ← Pub/Sub (review-processed) ←──┘
```

## Services

| Service | Port | Description |
|---|---|---|
| service-a | 3001 | Movie API + review submission |
| notification-service | 3002 | WebSocket + Pub/Sub subscriber |
| frontend | 5173 | React dashboard |

## Environment Setup

Each service has a `.env.example` documenting all required variables with inline comments pointing to the exact GCP console page where you find each value.

| Service | Env file | Key variables |
|---|---|---|
| [service-a](service-a/.env.example) | `service-a/.env` | `GCP_PROJECT_ID`, `MONGODB_URI`, `MOCK_PUBSUB` |
| [cf-analytics](cf-analytics/.env.example) | `cf-analytics/.env` | `GCP_PROJECT_ID`, `BIGQUERY_DATASET` |
| [cf-review-analyzer](cf-review-analyzer/.env.example) | `cf-review-analyzer/.env` | `GCP_PROJECT_ID`, `GEMINI_API_KEY` |
| [notification-service](notification-service/.env.example) | `notification-service/.env` | `GCP_PROJECT_ID`, `SERVICE_A_GRPC_URL` |
| [frontend](frontend/.env.example) | `frontend/.env` | `VITE_API_URL`, `VITE_WS_URL` |

**Local development without GCP credentials:** Set `MOCK_PUBSUB=true` and `MOCK_FIRESTORE=true` in service-a and notification-service to bypass real GCP calls. The functions framework can be run locally with `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account key.

### Required GitHub Secrets (for CD pipelines)

| Secret | Where to find it |
|---|---|
| `GCP_SA_KEY` | GCP Console → IAM → Service Accounts → Create Key (JSON) |
| `GCP_PROJECT_ID` | GCP Console → top nav → Project ID |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `FIREBASE_TOKEN` | `firebase login:ci` in terminal |
| `VITE_API_URL` | Cloud Run → service-a → URL |
| `VITE_WS_URL` | Cloud Run → notification-service → URL (replace https with wss) |

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs lint → typecheck → test in parallel for all 5 services on every PR and push to `main`
- **CD Backend** (`.github/workflows/cd-backend.yml`): deploys only changed services to Cloud Run / Cloud Functions on push to `main`
- **CD Frontend** (`.github/workflows/cd-frontend.yml`): builds and deploys to Firebase Hosting when `frontend/**` changes

## Git Hooks (Husky)

| Hook | Runs |
|---|---|
| `pre-commit` | `npm run lint` + `npm run typecheck` across all workspaces |
| `commit-msg` | Enforces Conventional Commits format (`feat(scope): description`) |
| `pre-push` | `npm run test:run` across all workspaces |
