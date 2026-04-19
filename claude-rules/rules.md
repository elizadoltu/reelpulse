# Claude Rules for ReelPulse

Guidelines for using Claude (or any AI assistant) in this project.

---

## 1. Project context to always provide

When starting a new conversation, give Claude this context:

```
Project: ReelPulse — GCP monorepo (service-a, cf-analytics, cf-review-analyzer, notification-service, frontend)
Stack: Fastify, Cloud Run, Cloud Functions (gen2), Pub/Sub, BigQuery, Firestore, Gemini, React+Vite+Tailwind
Language: TypeScript everywhere (strict mode, ES2022, NodeNext)
Style: single quotes, 2-space indent, trailing commas (.prettierrc at root)
Tests: Vitest for all services; React Testing Library for frontend
```

---

## 2. Code generation rules

- **TypeScript only** — never generate plain JavaScript for services (load-tests use JS for k6 compatibility)
- **No `any`** — use proper types; `unknown` + narrowing if the shape is truly unknown
- **Imports** — use `import type` for type-only imports; use `.js` extension for local imports (NodeNext module resolution)
- **Error handling** — propagate errors with context; never swallow with empty `catch {}`
- **No console.log** — use `fastify.log` in services, structured logging only
- **Environment variables** — always read from `process.env`; never hardcode values; update `.env.example` when adding new vars
- **No secrets in code** — never put API keys, connection strings, or credentials in source files

---

## 3. Service-specific rules

### service-a
- Use Fastify plugins (`fastify.register`) for routing — no monolithic files
- Rate limiting already set up via `@fastify/rate-limit` — don't bypass it
- All review routes return `202 Accepted` immediately then publish to Pub/Sub (async processing)

### cf-analytics / cf-review-analyzer
- Cloud Functions gen2 — use `@google-cloud/functions-framework` HTTP handler, not Express
- Always include idempotency check before writing to BigQuery/Firestore (use `messageId` as document ID)
- Keep function cold-start time low: initialize GCP clients outside the handler (module scope)

### notification-service
- WebSocket connections stored in a `Map<userId, WebSocket>` — no external state store
- All Pub/Sub messages must be acked, even on error (to avoid redelivery loops; send to DLQ instead)

### frontend
- Absolute imports via `@/` alias — never use relative `../../` paths deeper than one level
- All API URLs from `import.meta.env.VITE_API_URL` — never hardcode localhost
- `useWebSocket` hook must handle reconnect and not crash on connection loss

---

## 4. Testing rules

- Every new function/handler needs at least one Vitest unit test
- Test files co-located: `src/foo.ts` → `src/foo.test.ts`
- Mock GCP clients in tests (`vi.mock('@google-cloud/pubsub', ...)`) — never hit real GCP in unit tests
- Frontend component tests use React Testing Library — no snapshot tests

---

## 5. Git and PR rules

- Branch format: `feat/REEL-[n]-short-description` or `fix/REEL-[n]-short-description`
- Commit format (enforced by Husky): `type(scope): description` — e.g. `feat(service-a): publish MovieViewedEvent`
- Use `bash scripts/create-pr.sh` to open PRs — it enforces the REEL-[n] title format
- Never commit `.env` files — only `.env.example`
- PRs require 1 approval before merge (branch protection on `main`)

---

## 6. What NOT to ask Claude to do

- **Generate GCP service account keys or credentials** — create these manually in the console
- **Write to production databases directly** — all data mutations go through the service layer
- **Bypass Husky hooks** (`--no-verify`) — fix the underlying lint/type error instead
- **Remove or weaken rate limiting** — it's a graded requirement
- **Add features outside the MVP scope** — see the MVP doc; deadline is April 27-30, 2026

---

## 7. Prompting tips for this project

When asking for a Cloud Function implementation:
> "Write a Cloud Functions gen2 TypeScript handler for `@google-cloud/functions-framework` that [does X]. Use module-scope GCP client initialization, include idempotency via messageId, and add a Vitest test that mocks the BigQuery/Firestore client."

When asking for a Fastify route:
> "Add a Fastify route `POST /movies/:id/reviews` to service-a that: validates the body, returns 202 immediately, publishes to Pub/Sub topic `review-submitted`, and creates a pending Firestore document. Include a Vitest test."

When asking for a React component:
> "Create a React component in `frontend/src/` using TypeScript and Tailwind. Use the `@/` import alias. Do not use any inline styles."
