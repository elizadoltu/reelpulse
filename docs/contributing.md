# How to Work on ReelPulse

This document covers everything you need to contribute to the repo: branch naming, commit messages, pull requests, and the most common terminal commands.

---

## 1. Branch naming

Every branch must be tied to a REEL ticket. Format:

```
type/REEL-[number]-short-description
```

| Type | When to use |
|---|---|
| `feat/` | new feature or functionality |
| `fix/` | bug fix |
| `refactor/` | code restructure, no new behaviour |
| `chore/` | dependency update, config change |
| `test/` | adding or fixing tests only |
| `ci/` | CI/CD pipeline changes |
| `docs/` | documentation only |

**Examples:**
```
feat/REEL-12-movie-view-event-publisher
fix/REEL-15-websocket-reconnect-loop
chore/REEL-20-update-fastify-version
docs/REEL-22-add-gcp-setup-guide
```

**Rules:**
- Always branch off `main` (never branch off another feature branch)
- Use lowercase and hyphens only — no spaces, no uppercase
- Keep the description short (3–5 words)

---

## 2. Starting a task

```bash
# 1. Make sure you are on main and up to date
git checkout main
git pull

# 2. Create your branch
git checkout -b feat/REEL-12-movie-view-event-publisher
```

---

## 3. Commit messages

We use **Conventional Commits**. Husky enforces this automatically — your commit will be rejected if the format is wrong.

```
type(scope): short description
```

| Part | Options |
|---|---|
| `type` | `feat` `fix` `chore` `docs` `style` `refactor` `test` `ci` `perf` `build` |
| `scope` | `service-a` `cf-analytics` `cf-review-analyzer` `notification-service` `frontend` `infra` `ci` `proto` |
| `description` | imperative, lowercase, no period at end |

**Good examples:**
```bash
git commit -m "feat(service-a): publish MovieViewedEvent to Pub/Sub"
git commit -m "fix(notification-service): handle websocket reconnect on close"
git commit -m "test(cf-analytics): add unit test for BigQuery insert"
git commit -m "chore(frontend): update react-router-dom to 6.23"
git commit -m "ci: add path filter for cf-analytics deploy job"
git commit -m "docs: add gcp setup guide to docs folder"
```

**Bad examples** (will be rejected):
```bash
git commit -m "fixed stuff"            # no type, no scope
git commit -m "feat: added the thing"  # vague
git commit -m "WIP"                    # not a valid type
```

**Stage specific files** — avoid `git add .` which can accidentally include `.env` files:
```bash
git add service-a/src/routes.ts
git add service-a/src/routes.test.ts
git commit -m "feat(service-a): add GET /movies/:id route"
```

---

## 4. Pull requests

### Opening a PR with the script (recommended)

```bash
bash scripts/create-pr.sh
```

The script will ask you:
1. Ticket number → type `12` → becomes `REEL-12`
2. PR type → pick from the menu
3. Short description
4. Target branch (default: `main`)

It pushes your branch if needed, then creates the PR with the correct title format automatically.

---

### PR title format

```
REEL-[number] type: short description
```

**Examples:**
```
REEL-12 feat: publish MovieViewedEvent to Pub/Sub
REEL-15 fix: websocket reconnect on close
REEL-20 chore: update fastify to 4.27
```

---

### PR description

When you open a PR (via the script or GitHub), the template is pre-filled. Fill in the relevant sections:

- **Type of change** — check the matching box
- **Related services** — check every service your PR touches
- **What does this PR do?** — 2–4 bullet points, focus on *why* not just *what*
- **How to test locally** — paste the curl command or steps so the reviewer can reproduce it
- **Checklist** — go through it before requesting review

---

### PR rules

- **1 approval required** before merging (branch protection on `main`)
- PRs must pass CI (lint + typecheck + tests) before they can be merged
- Never commit directly to `main`
- Keep PRs focused — one ticket, one concern. If you discover a separate bug, open a separate PR

---

## 5. Keeping your branch up to date

If `main` has moved ahead while you were working:

```bash
git fetch origin
git rebase origin/main
```

If there are conflicts, Git will pause and show you the conflicting files. Fix them, then:

```bash
git add the-fixed-file.ts
git rebase --continue
```

---

## 6. Definition of done

A task is done when all four are true:

1. Works end-to-end in the deployed GCP environment (not just locally)
2. At least one Vitest unit test passes for the changed service
3. Documented in README if it changes public-facing behaviour
4. Covered in at least one section of the scientific report

---

## 7. Common commands

### Run the project

```bash
npm run install:all          # first time — install all dependencies

npm run dev                  # everything at once (frontend + service-a + notification-service)
npm run dev:frontend         # frontend only → http://localhost:5173
npm run dev:service-a        # service-a only → http://localhost:3001
npm run dev:notification     # notification-service only → http://localhost:3002
```

### Check your code before committing

```bash
npm run lint                                  # ESLint — all services
npm run typecheck --workspaces --if-present   # TypeScript — all services
npm run test:run --workspaces --if-present    # Vitest — all services
```

### Build

```bash
npm run build                # build all services
npm run build:frontend       # build frontend → frontend/dist/
```

### Load tests (k6 must be installed: `brew install k6`)

```bash
# Make sure service-a is running first
npm run dev:service-a

# Run load tests
k6 run load-tests/analytics.js         # simulates movie browsing
k6 run load-tests/review-submission.js # simulates review posting + triggers rate limiter

# Quick 10-second smoke run
k6 run --vus 2 --duration 10s load-tests/analytics.js

# Export results to JSON for the scientific report
k6 run --out json=load-tests/results-analytics.json load-tests/analytics.js
```

### Git

```bash
git status                    # what changed
git diff                      # unstaged changes
git diff --staged             # what will be committed
git log --oneline -10         # last 10 commits

git stash                     # save uncommitted work temporarily
git stash pop                 # restore it

git fetch origin
git rebase origin/main        # pull latest main into your branch
```

### GCP infrastructure (run once per environment)

```bash
export GCP_PROJECT_ID=your-project-id
bash infra/setup.sh           # creates Pub/Sub, BigQuery, Firestore, Artifact Registry, Scheduler
```

---

## 8. What Husky does automatically

You do not need to run these manually — they fire on their own:

| Hook | Fires when | What it runs |
|---|---|---|
| `pre-commit` | `git commit` | `npm run lint` + `npm run typecheck` across all services |
| `commit-msg` | `git commit` | Validates the commit message format |
| `pre-push` | `git push` | `npm run test:run` across all services |

If a hook fails, **the commit or push is blocked**. Fix the error it reports, then try again. Never bypass hooks with `--no-verify`.

---

## 9. Service ports and URLs

| Service | Local | Description |
|---|---|---|
| frontend | http://localhost:5173 | React dashboard |
| service-a | http://localhost:3001 | Movie API + review submission |
| notification-service | http://localhost:3002 | WebSocket + Pub/Sub subscriber |
| cf-analytics (local) | http://localhost:8081 | Cloud Function — analytics processor |
| cf-review-analyzer (local) | http://localhost:8082 | Cloud Function — Gemini review analyzer |
