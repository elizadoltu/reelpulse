#!/bin/bash
# GCP infrastructure setup script for ReelPulse
# Idempotent — safe to run multiple times.
# Usage: GCP_PROJECT_ID=my-project bash infra/setup.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID env var required}"
REGION="${GCP_REGION:-europe-west1}"

PASS=0
FAIL=0

ok()   { echo "  ✅  $*"; PASS=$((PASS+1)); }
fail() { echo "  ❌  $*"; FAIL=$((FAIL+1)); }
step() { echo ""; echo "▶ $*"; }

echo "=================================================="
echo " ReelPulse GCP Setup"
echo " Project : $PROJECT_ID"
echo " Region  : $REGION"
echo "=================================================="

gcloud config set project "$PROJECT_ID" --quiet

# ── Enable APIs ──────────────────────────────────────────────────────────────
step "Enabling GCP APIs..."
gcloud services enable \
  pubsub.googleapis.com \
  bigquery.googleapis.com \
  bigquerystorage.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  --quiet && ok "All APIs enabled" || fail "Failed to enable some APIs"

# ── Artifact Registry ────────────────────────────────────────────────────────
step "Creating Artifact Registry repository..."
gcloud artifacts repositories create reelpulse \
  --repository-format=docker \
  --location="$REGION" \
  --description="ReelPulse container images" \
  --quiet 2>/dev/null && ok "Artifact Registry: reelpulse created" || ok "Artifact Registry: reelpulse already exists"

# ── Pub/Sub Topics ───────────────────────────────────────────────────────────
step "Creating Pub/Sub topics..."
for TOPIC in movie-events movie-events-dlq review-submitted review-submitted-dlq review-processed review-processed-dlq; do
  gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID" --quiet 2>/dev/null \
    && ok "Topic: $TOPIC" || ok "Topic: $TOPIC (already exists)"
done

# ── Pub/Sub Subscriptions (with DLQ) ─────────────────────────────────────────
step "Creating Pub/Sub subscriptions with dead-letter queues..."

gcloud pubsub subscriptions create movie-events-sub \
  --topic=movie-events \
  --dead-letter-topic=movie-events-dlq \
  --max-delivery-attempts=5 \
  --ack-deadline=60 \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && ok "Subscription: movie-events-sub" || ok "Subscription: movie-events-sub (already exists)"

gcloud pubsub subscriptions create review-submitted-sub \
  --topic=review-submitted \
  --dead-letter-topic=review-submitted-dlq \
  --max-delivery-attempts=5 \
  --ack-deadline=60 \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && ok "Subscription: review-submitted-sub" || ok "Subscription: review-submitted-sub (already exists)"

gcloud pubsub subscriptions create review-processed-sub \
  --topic=review-processed \
  --dead-letter-topic=review-processed-dlq \
  --max-delivery-attempts=5 \
  --ack-deadline=60 \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null && ok "Subscription: review-processed-sub" || ok "Subscription: review-processed-sub (already exists)"

# ── BigQuery ─────────────────────────────────────────────────────────────────
step "Creating BigQuery dataset and tables..."

bq --location="$REGION" mk \
  --dataset \
  --description="ReelPulse analytics dataset" \
  "$PROJECT_ID:reelpulse" 2>/dev/null && ok "BigQuery dataset: reelpulse" || ok "BigQuery dataset: reelpulse (already exists)"

bq mk \
  --table \
  --description="Movie view events from Pub/Sub" \
  "$PROJECT_ID:reelpulse.movie_views" \
  "movieId:STRING,userId:STRING,timestamp:TIMESTAMP,genre:STRING,sessionId:STRING" \
  2>/dev/null && ok "BigQuery table: movie_views" || ok "BigQuery table: movie_views (already exists)"

# ── Firestore ────────────────────────────────────────────────────────────────
step "Initializing Firestore (Native mode)..."
gcloud firestore databases create \
  --location="$REGION" \
  --quiet 2>/dev/null && ok "Firestore: Native mode database created" || ok "Firestore: database already exists"

# ── Cloud Scheduler ───────────────────────────────────────────────────────────
step "Creating Cloud Scheduler job for analytics summary..."

# Requires service-a to be deployed first — use placeholder URL until then
SERVICE_A_URL="${SERVICE_A_URL:-https://service-a-placeholder.a.run.app}"

gcloud scheduler jobs create http analytics-summary \
  --location="$REGION" \
  --schedule="* * * * *" \
  --uri="$SERVICE_A_URL/analytics/summary" \
  --http-method=POST \
  --message-body='{}' \
  --headers="Content-Type=application/json" \
  --quiet 2>/dev/null && ok "Scheduler: analytics-summary (every 60s)" || ok "Scheduler: analytics-summary (already exists)"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo " Setup complete"
echo " ✅  Passed : $PASS"
if [ "$FAIL" -gt 0 ]; then
  echo " ❌  Failed : $FAIL"
  echo ""
  echo " Review errors above and re-run to retry failed steps."
  exit 1
else
  echo "=================================================="
fi
