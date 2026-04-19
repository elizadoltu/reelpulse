# Project Structure

```
reelpulse/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # Lint + typecheck + test on every PR
│   │   ├── cd-backend.yml       # Deploy services to Cloud Run / Cloud Functions
│   │   └── cd-frontend.yml      # Deploy frontend to Firebase Hosting
│   └── pull_request_template.md
├── .husky/                      # Git hooks (pre-commit, commit-msg, pre-push)
├── scripts/
│   └── create-pr.sh             # Interactive PR creator (REEL-[n] title format)
├── service-a/                   # Fastify REST API — Cloud Run
│   ├── src/index.ts
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── cf-analytics/                # Cloud Function — movie-events → BigQuery
│   ├── src/index.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── cf-review-analyzer/          # Cloud Function — review-submitted → Gemini → Firestore
│   ├── src/index.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── notification-service/        # Fastify + WebSocket — Cloud Run
│   ├── src/index.ts
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # Vite + React + Tailwind — Firebase Hosting
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   └── package.json
├── proto/
│   └── reelpulse.proto          # gRPC: MovieService (Notification ↔ Service A)
├── load-tests/
│   ├── analytics.js             # k6: GET /movies/:id load test
│   └── review-submission.js     # k6: POST /movies/:id/reviews load test
├── infra/
│   └── setup.sh                 # Idempotent GCP bootstrap script
├── docs/                        # You are here
├── claude-rules/                # AI assistant coding rules
├── tsconfig.base.json           # Shared TS config (strict, ES2022, NodeNext)
├── .eslintrc.json               # Root ESLint (typescript-eslint + prettier)
├── .prettierrc                  # Single quotes, 2-space, trailing commas
├── package.json                 # npm workspaces root
└── .env.example                 # Root-level env reference
```

## Data Flow

```
[Browser]
    │  GET /movies/:id
    ▼
[Service A — Fastify]
    ├─── publishes MovieViewedEvent ──► [Pub/Sub: movie-events]
    │                                         │
    │                                         ▼
    │                                  [CF#1 Analytics]
    │                                         │
    │                                         ▼
    │                                   [BigQuery]
    │
    │  POST /movies/:id/reviews
    ├─── 202 Accepted ──────────────► [Pub/Sub: review-submitted]
    │     └── stub in Firestore              │
    │                                        ▼
    │                                 [CF#2 Review Analyzer]
    │                                         │
    │                              Gemini AI analysis
    │                                         │
    │                                 Firestore (status: processed)
    │                                         │
    │                                         ▼
    │                               [Pub/Sub: review-processed]
    │                                         │
    │                                         ▼
    │                             [Notification Service — WS]
    │                                         │
    ▼                                         ▼
[Browser] ◄──────── WebSocket ───────────────┘
```

## Port Map

| Service | Local port | Cloud URL source |
|---|---|---|
| service-a | 3001 | Cloud Run → service-a |
| notification-service | 3002 | Cloud Run → notification-service |
| frontend | 5173 | Firebase Hosting |
