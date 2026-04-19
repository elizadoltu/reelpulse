# Commands Reference

All commands run from the **repo root** unless noted otherwise.

---

## Install

```bash
npm run install:all          # install all workspace dependencies
```

---

## Run the project

### All services at once (recommended during development)
```bash
npm run dev
# starts: frontend :5173 + service-a :3001 + notification-service :3002
```

### Individually
```bash
npm run dev:frontend          # http://localhost:5173
npm run dev:service-a         # http://localhost:3001
npm run dev:notification      # http://localhost:3002
```

### Cloud Functions locally (separate terminal per function)
```bash
cd cf-analytics
npx @google-cloud/functions-framework --target=analyticsProcessor --port=8081

cd cf-review-analyzer
npx @google-cloud/functions-framework --target=reviewAnalyzer --port=8082
```

### Test a running service
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health

# Send a test event to a local Cloud Function
curl -X POST http://localhost:8081 \
  -H "Content-Type: application/json" \
  -d '{"movieId":"tt0109830","userId":"user-1","timestamp":"2026-04-19T10:00:00Z"}'
```

---

## Build

```bash
npm run build                 # build all workspaces
npm run build:frontend        # build only frontend → frontend/dist/
npm run build:service-a       # compile only service-a → service-a/dist/
```

---

## Lint & format

```bash
npm run lint                  # ESLint — all workspaces
npm run lint:frontend         # ESLint — frontend only
npm run lint:service-a        # ESLint — service-a only

npm run format                # Prettier write — all workspaces
npm run format:check          # Prettier check (no write) — all workspaces
```

---

## Type-check

```bash
npm run typecheck --workspaces --if-present    # all workspaces
```

Or per service:
```bash
cd service-a && npx tsc --noEmit
cd frontend  && npx tsc --noEmit
```

---

## Tests

```bash
npm run test:run                  # all workspaces, one-shot (for CI)
npm run test:run:frontend         # frontend only, one-shot

# Watch mode (re-runs on file change — use during development)
cd service-a           && npx vitest
cd notification-service && npx vitest
cd frontend            && npx vitest
```

---

## Load tests (k6)

> Requires service-a running first: `npm run dev:service-a`

```bash
# Analytics load test (GET /movies/:id)
k6 run load-tests/analytics.js

# Review submission load test (POST /movies/:id/reviews — also triggers 429)
k6 run load-tests/review-submission.js

# Quick smoke run (2 virtual users, 10 seconds — good for checking k6 works)
k6 run --vus 2 --duration 10s load-tests/analytics.js

# Run against deployed Cloud Run instead of localhost
SERVICE_A_URL=https://service-a-xxxx.run.app k6 run load-tests/analytics.js

# Export results to JSON (for scientific report graphs)
k6 run --out json=load-tests/results-analytics.json load-tests/analytics.js
k6 run --out json=load-tests/results-reviews.json   load-tests/review-submission.js
```

### Reading k6 output

```
http_req_duration  p(95)=42ms    ← 95% of requests finished in under 42ms
http_req_failed    rate=0.00%    ← 0% errors
✓ threshold passed / ✗ threshold broken → test exits with error code (CI fails)
```

---

## Git workflow

### Start a new task
```bash
git checkout main
git pull
git checkout -b feat/REEL-12-short-description
```

### Commit (Husky enforces format automatically)
```bash
git add service-a/src/routes.ts          # stage specific files (safer than git add .)
git commit -m "feat(service-a): publish MovieViewedEvent to Pub/Sub"
# format: type(scope): description
# types: feat fix chore docs style refactor test ci perf build
```

### Push and open a PR
```bash
# Option 1 — interactive script (recommended, sets REEL-[n] title automatically)
bash scripts/create-pr.sh

# Option 2 — manual push then open PR in browser
git push -u origin feat/REEL-12-short-description
gh pr create --title "REEL-12 feat: publish MovieViewedEvent" --body "..."

# Option 3 — open draft PR
gh pr create --draft --title "REEL-12 feat: ..." --body "..."
```

### Useful git commands
```bash
git status                    # what changed
git diff                      # unstaged changes
git diff --staged             # staged changes (what will be committed)
git log --oneline -10         # last 10 commits
git stash                     # save work in progress without committing
git stash pop                 # restore stashed work

git pull --rebase             # pull latest main and rebase your branch on top
```

### Merge main into your branch (when main has moved ahead)
```bash
git fetch origin
git rebase origin/main        # rebase your branch on top of latest main
```

---

## Docker (for Cloud Run images)

```bash
# Build service-a image
docker build -t service-a:local -f service-a/Dockerfile .

# Build notification-service image
docker build -t notification-service:local -f notification-service/Dockerfile .

# Run a built image locally
docker run -p 3001:3001 --env-file service-a/.env service-a:local

# See running containers
docker ps

# Stop a container
docker stop <container-id>
```

---

## GCP — gcloud

```bash
# Auth
gcloud auth login
gcloud auth application-default login        # used by GCP SDKs in code

# Set active project
gcloud config set project your-project-id

# Run the infra setup script (creates Pub/Sub, BigQuery, Firestore, etc.)
GCP_PROJECT_ID=your-project-id bash infra/setup.sh

# View Cloud Run service URLs
gcloud run services list --region=europe-west1

# View Cloud Function logs (live tail)
gcloud functions logs read analyticsProcessor --gen2 --region=europe-west1 --limit=50
gcloud functions logs read reviewAnalyzer     --gen2 --region=europe-west1 --limit=50

# Deploy service-a manually (CD pipeline does this automatically on push to main)
gcloud run deploy service-a \
  --image=europe-west1-docker.pkg.dev/YOUR_PROJECT/reelpulse/service-a:v1 \
  --region=europe-west1 --allow-unauthenticated --port=3001

# Publish a test Pub/Sub message
gcloud pubsub topics publish movie-events \
  --message='{"movieId":"tt0109830","userId":"user-1","timestamp":"2026-04-19T10:00:00Z"}'

# Check BigQuery for results
bq query --nouse_legacy_sql \
  "SELECT * FROM \`your-project.reelpulse.movie_views\` LIMIT 10"
```

---

## Firebase (frontend hosting)

```bash
# First-time setup (run once)
npm install -g firebase-tools
firebase login
firebase init hosting   # select project, set public dir to frontend/dist

# Deploy frontend manually
cd frontend && npm run build
firebase deploy --only hosting

# Get a CI token (paste as GitHub Secret FIREBASE_TOKEN)
firebase login:ci
```

---

## Husky hooks (run automatically, but you can trigger manually)

```bash
# pre-commit — lint + typecheck
npm run lint --workspaces --if-present
npm run typecheck --workspaces --if-present

# pre-push — full test suite
npm run test:run --workspaces --if-present

# Reinstall hooks (if they stop working after npm install)
npm run prepare
```

---

## Useful one-liners

```bash
# Kill whatever is running on a port
lsof -ti:3001 | xargs kill
lsof -ti:3002 | xargs kill
lsof -ti:5173 | xargs kill

# Check what is listening on a port
lsof -i:3001

# See all running node processes
ps aux | grep node

# Clear npm cache (if install is broken)
npm cache clean --force

# Check which workspace a package belongs to
npm ls fastify
```
