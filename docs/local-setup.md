# Local Setup Guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | >= 20 | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| npm | >= 10 | bundled with Node 20 |
| git | any | [git-scm.com](https://git-scm.com) |
| gh CLI | any | `brew install gh` or [cli.github.com](https://cli.github.com) |
| k6 | any | `brew install k6` (load tests only) |
| gcloud | any | [cloud.google.com/sdk](https://cloud.google.com/sdk) (GCP deploys only) |

---

## 1. Clone and install

```bash
git clone https://github.com/elizadoltu/reelpulse.git
cd reelpulse
npm run install:all
```

## 2. Set up environment variables

Each service has a `.env.example`. Copy and fill in the values:

```bash
cp service-a/.env.example             service-a/.env
cp cf-analytics/.env.example          cf-analytics/.env
cp cf-review-analyzer/.env.example    cf-review-analyzer/.env
cp notification-service/.env.example  notification-service/.env
cp frontend/.env.example              frontend/.env
```

**Running locally without GCP?** Set these in `service-a/.env` and `notification-service/.env`:
```
MOCK_PUBSUB=true
MOCK_FIRESTORE=true
```
This bypasses real GCP calls so you can develop the API layer without cloud credentials.

## 3. Start development servers

```bash
# All at once (frontend + service-a + notification-service)
npm run dev

# Or individually
npm run dev:frontend      # http://localhost:5173
npm run dev:service-a     # http://localhost:3001
npm run dev:notification  # http://localhost:3002
```

## 4. Run tests

```bash
npm run test:run              # all workspaces
npm run test:run:frontend     # frontend only
```

## 5. Lint and type-check

```bash
npm run lint        # ESLint across all workspaces
npm run format      # Prettier write
```

---

## Git workflow

### Create a feature branch
```bash
git checkout -b feat/REEL-12-add-movie-publisher
```

### Commit (Conventional Commits enforced by Husky)
```bash
git add .
git commit -m "feat(service-a): publish MovieViewedEvent to Pub/Sub"
```

Husky runs on commit:
- `pre-commit` → lint + typecheck
- `commit-msg` → validates `type(scope): description` format

### Open a PR
```bash
bash scripts/create-pr.sh
# Prompts: ticket number, type, description → creates PR with REEL-[n] in title
```

---

## Cloud Functions local testing

```bash
cd cf-analytics
npx @google-cloud/functions-framework --target=analyticsProcessor --port=8081

cd cf-review-analyzer
npx @google-cloud/functions-framework --target=reviewAnalyzer --port=8082
```

Send a test payload:
```bash
curl -X POST http://localhost:8081 \
  -H "Content-Type: application/json" \
  -d '{"movieId":"tt0109830","userId":"user-1","timestamp":"2026-04-19T10:00:00Z"}'
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run install:all` fails | Make sure you're on Node 20 (`node -v`) |
| Port already in use | Kill the process: `lsof -ti:3001 \| xargs kill` |
| TypeScript errors after pulling | Run `npm run typecheck` to see all errors at once |
| Husky hooks not running | Run `npm run prepare` to re-install hooks |
