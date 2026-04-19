# GCP Setup Guide

This guide walks you through setting up every GCP service ReelPulse needs, from zero.
Each section tells you exactly where to click and what to run.

---

## 0. Before you start

1. Create a Google account if you don't have one.
2. Go to [console.cloud.google.com](https://console.cloud.google.com).
3. Accept the terms and **activate the free trial** (you get $300 credit, no charge until you upgrade).

---

## 1. Create a GCP Project

1. Click the project dropdown at the top of the page → **New Project**.
2. Name it `reelpulse` (or anything you like).
3. Click **Create** and wait ~10 seconds.
4. Select the new project from the dropdown. The **Project ID** appears in the URL and header — copy it. You'll need it everywhere.

```bash
export GCP_PROJECT_ID=your-project-id   # paste your Project ID here
gcloud config set project $GCP_PROJECT_ID
```

---

## 2. Enable Billing

GCP services won't work without billing enabled (free trial counts as billing).

1. Console → **Billing** (left sidebar or search).
2. Click **Link a billing account** → select your free trial account.

---

## 3. Install and authenticate gcloud CLI

```bash
# macOS
brew install --cask google-cloud-sdk

# Authenticate
gcloud auth login
gcloud auth application-default login   # used by SDK clients in your code
```

---

## 4. Run the infrastructure script

This single script creates everything (Pub/Sub, BigQuery, Firestore, etc.):

```bash
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=europe-west1          # or us-central1, etc.
bash infra/setup.sh
```

If a step fails, fix it and re-run — the script is idempotent (safe to run multiple times).

---

## 5. Pub/Sub (what it is and why)

Pub/Sub is a message bus. When a user views a movie, Service A publishes a message to a **topic**. Cloud Functions subscribe and react — this decouples services so they don't call each other directly.

**Topics created by the script:**

| Topic | Publisher | Subscriber |
|---|---|---|
| `movie-events` | Service A | CF#1 Analytics |
| `movie-events-dlq` | GCP (dead letters) | you (manual inspection) |
| `review-submitted` | Service A | CF#2 Review Analyzer |
| `review-submitted-dlq` | GCP | you |
| `review-processed` | CF#2 | Notification Service |
| `review-processed-dlq` | GCP | you |

**Verify in console:** Console → **Pub/Sub** → Topics. You should see 6 topics.

**What is a DLQ?** Dead Letter Queue — if a message fails to process 5 times, GCP moves it here instead of retrying forever. Check it when debugging failed messages.

---

## 6. BigQuery (analytics storage)

BigQuery is a serverless data warehouse. CF#1 writes one row every time someone views a movie.

**Dataset/table created by the script:** `reelpulse.movie_views`

**Verify:** Console → **BigQuery** → your project → `reelpulse` → `movie_views`.

**Run a test query:**
```sql
SELECT movieId, COUNT(*) as views
FROM `your-project-id.reelpulse.movie_views`
GROUP BY movieId
ORDER BY views DESC
LIMIT 10
```

---

## 7. Firestore (review status tracking)

Firestore is a NoSQL document database. It tracks each review's status (`pending` → `processed`) so the frontend can show the user what's happening.

**Created by the script:** a default Firestore database in Native mode.

**Document structure:**
```
reviews/{reviewId}
  ├── movieId: string
  ├── userId: string
  ├── rating: number
  ├── text: string
  ├── status: "pending" | "processed"
  ├── createdAt: timestamp
  └── analysis: { sentiment, summary, score }   ← added by CF#2
```

**Verify:** Console → **Firestore** → you should see the database with Native mode badge.

---

## 8. Cloud Functions

Cloud Functions are serverless — you deploy code and GCP runs it when triggered.

### CF#1: Analytics Processor
- **Trigger:** Pub/Sub topic `movie-events`
- **What it does:** Decodes the message, writes a row to BigQuery `movie_views`
- **Deploy:** handled automatically by CD pipeline, or manually:

```bash
cd cf-analytics && npm run build
gcloud functions deploy analyticsProcessor \
  --gen2 --runtime=nodejs20 \
  --region=europe-west1 \
  --trigger-topic=movie-events \
  --entry-point=analyticsProcessor \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID,BIGQUERY_DATASET=reelpulse,BIGQUERY_TABLE=movie_views"
```

### CF#2: Review Analyzer (Gemini)
- **Trigger:** Pub/Sub topic `review-submitted`
- **What it does:** Calls Gemini AI to analyze the review text, writes analysis to Firestore, publishes to `review-processed`
- **Gemini API key:** Get it at [aistudio.google.com](https://aistudio.google.com) → **Get API key**

```bash
cd cf-review-analyzer && npm run build
gcloud functions deploy reviewAnalyzer \
  --gen2 --runtime=nodejs20 \
  --region=europe-west1 \
  --trigger-topic=review-submitted \
  --entry-point=reviewAnalyzer \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID,GEMINI_API_KEY=your-key"
```

**Verify:** Console → **Cloud Functions** → you should see both functions with a green checkmark.

---

## 9. Artifact Registry (Docker images)

Artifact Registry stores Docker images for Cloud Run services.

**Created by the script:** repository `reelpulse` in `europe-west1`.

**Authenticate Docker:**
```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

**Verify:** Console → **Artifact Registry** → Repositories → `reelpulse`.

---

## 10. Cloud Run (service-a and notification-service)

Cloud Run runs Docker containers. It scales to zero automatically (no idle cost).

### Deploy service-a manually

```bash
IMAGE="europe-west1-docker.pkg.dev/$GCP_PROJECT_ID/reelpulse/service-a:v1"

docker build -t "$IMAGE" -f service-a/Dockerfile .
docker push "$IMAGE"

gcloud run deploy service-a \
  --image="$IMAGE" \
  --region=europe-west1 \
  --allow-unauthenticated \
  --port=3001 \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID"
```

### Deploy notification-service manually

```bash
IMAGE="europe-west1-docker.pkg.dev/$GCP_PROJECT_ID/reelpulse/notification-service:v1"

docker build -t "$IMAGE" -f notification-service/Dockerfile .
docker push "$IMAGE"

gcloud run deploy notification-service \
  --image="$IMAGE" \
  --region=europe-west1 \
  --allow-unauthenticated \
  --port=3002 \
  --set-env-vars="GCP_PROJECT_ID=$GCP_PROJECT_ID"
```

**Get the service URL:**
```bash
gcloud run services describe service-a --region=europe-west1 --format='value(status.url)'
```

**Verify:** Console → **Cloud Run** → you should see both services with a green status.

---

## 11. Cloud Scheduler

Cloud Scheduler calls an HTTP endpoint on a schedule (like a cron job). It's used to trigger analytics summaries every 60 seconds.

**Created by the script** (after service-a is deployed):
```bash
# Update the scheduler URL after you get the Cloud Run URL
SERVICE_A_URL=$(gcloud run services describe service-a --region=europe-west1 --format='value(status.url)')

gcloud scheduler jobs update http analytics-summary \
  --location=europe-west1 \
  --uri="$SERVICE_A_URL/analytics/summary"
```

**Verify:** Console → **Cloud Scheduler** → `analytics-summary` job.

---

## 12. Firebase Hosting (frontend)

Firebase Hosting serves the React frontend as a static site with a CDN.

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, set public dir to frontend/dist
```

**Deploy manually:**
```bash
cd frontend && npm run build
firebase deploy --only hosting
```

**Get token for CI:**
```bash
firebase login:ci    # copy the token → add as GitHub Secret FIREBASE_TOKEN
```

---

## 13. Service Account + GitHub Secrets

The CD pipeline needs a service account key to deploy to GCP.

### Create a service account

```bash
gcloud iam service-accounts create reelpulse-ci \
  --display-name="ReelPulse CI/CD"

# Grant required roles
for ROLE in \
  roles/run.admin \
  roles/cloudfunctions.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser \
  roles/pubsub.admin \
  roles/bigquery.admin \
  roles/datastore.owner \
  roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
    --member="serviceAccount:reelpulse-ci@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# Create and download key
gcloud iam service-accounts keys create /tmp/reelpulse-ci-key.json \
  --iam-account="reelpulse-ci@$GCP_PROJECT_ID.iam.gserviceaccount.com"

cat /tmp/reelpulse-ci-key.json   # copy the entire JSON
```

### Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Secret name | Value |
|---|---|
| `GCP_SA_KEY` | entire contents of the JSON key file |
| `GCP_PROJECT_ID` | your project ID string |
| `GEMINI_API_KEY` | from aistudio.google.com |
| `FIREBASE_TOKEN` | from `firebase login:ci` |
| `VITE_API_URL` | Cloud Run URL for service-a |
| `VITE_WS_URL` | Cloud Run URL for notification-service (replace `https://` with `wss://`) |

---

## 14. Verify end-to-end

Once everything is deployed:

```bash
# 1. View a movie (triggers movie-events → CF#1 → BigQuery)
curl https://your-service-a-url.run.app/movies/tt0109830

# 2. Check BigQuery for the row
bq query --nouse_legacy_sql \
  "SELECT * FROM \`$GCP_PROJECT_ID.reelpulse.movie_views\` LIMIT 5"

# 3. Submit a review (triggers review-submitted → CF#2 → Firestore → review-processed → WS)
curl -X POST https://your-service-a-url.run.app/movies/tt0109830/reviews \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-1","rating":5,"text":"Brilliant film!"}'

# 4. Check Firestore
# Console → Firestore → reviews collection → find your reviewId → status should become "processed"
```

---

## Quick Reference

| What you need | Where to find it |
|---|---|
| Project ID | Console top nav → project dropdown |
| Pub/Sub topics | Console → Pub/Sub → Topics |
| BigQuery data | Console → BigQuery → reelpulse → movie_views |
| Cloud Function logs | Console → Cloud Functions → your function → Logs |
| Cloud Run URL | Console → Cloud Run → your service → URL |
| Service account key | IAM → Service Accounts → Keys tab |
| Gemini API key | aistudio.google.com → Get API key |
| Firebase token | `firebase login:ci` in terminal |
