# Data ingestion job (GCP)

Scheduled Cloud Run job that builds the per-lake timetable packages from the latest official GTFS
and publishes them to `gs://lacus-data`. The live app reads from that bucket
(`VITE_DATA_BASE_URL` in `.env.production`). Users never see this URL.

The job is **not** run from this repository automatically. After merging, follow the Cloud
Shell commands below once. Adding a lake later is just adding it to `pipeline/lakes.ts`;
the next scheduled run will pick it up.

## What it does

1. Enumerates every lake in `pipeline/lakes.ts`.
2. Runs `npm run build:data -- --lake <id>` for each (downloads a new official GTFS only
   when the feed changed; publishes only when the resulting data changed).
3. `gcloud storage rsync`s the output to `gs://lacus-data` (no `--delete-unmatched`, so
   in-flight downloads of a previous hashed timetable still finish).
4. Sets cache headers: hashed `timetable.*.json` is immutable (1 year); `manifest.json` is
   revalidated every 5 minutes.

## Cost

The job uses a few thousand vCPU-seconds per month, well inside Cloud Run's free allowance.
Cloud Scheduler's first 3 jobs are free. A few cents/month at launch; no custom domain required.

## Deploy (Cloud Shell)

Replace `PROJECT` if your project id is not `lacus-app-509713`. The rest is copy-paste.

```bash
export PROJECT=lacus-app-509713
export REGION=europe-west6
export BUCKET=lacus-data
export REPO=lacus
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/ingest:latest"
gcloud config set project "${PROJECT}"
```

### 1. Enable APIs (once)

```bash
gcloud services enable \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com
```

### 2. Artifact Registry (once)

```bash
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Lacus ingestion images" \
  || echo "repo already exists"
```

### 3. Service account (once)

The job only needs to write to the data bucket. Nothing else.

```bash
gcloud iam service-accounts create lacus-ingest \
  --display-name="Lacus data ingest" \
  || echo "SA already exists"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --role=roles/storage.objectAdmin
```

The same account also triggers the job from Cloud Scheduler, so it needs to *run* the job:

```bash
# After the job exists (step 5), grant invoke:
gcloud run jobs add-iam-policy-binding lacus-ingest \
  --region="${REGION}" \
  --member="serviceAccount:lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --role=roles/run.invoker
```

And Cloud Scheduler needs permission to impersonate that account (once; uses your project number):

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
gcloud iam service-accounts add-iam-policy-binding \
  "lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudscheduler.iam.gserviceaccount.com" \
  --role=roles/iam.serviceAccountUser
```

### 4. Build and push the image

Clone the repo (or `cd` into it if already cloned), then:

```bash
gcloud builds submit --config=deploy/cloudbuild.yaml --substitutions=_IMAGE="${IMAGE}" .
```

This takes a few minutes the first time (Node 24 + gcloud in the image).

### 5. Create the Cloud Run Job (once; re-run to pick up a new image)

```bash
gcloud run jobs create lacus-ingest \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --service-account="lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --set-env-vars="DATA_BUCKET=gs://${BUCKET}" \
  --task-timeout=15m \
  --memory=1Gi \
  --cpu=1 \
  --max-retries=1 \
  || gcloud run jobs update lacus-ingest \
       --image="${IMAGE}" \
       --region="${REGION}" \
       --set-env-vars="DATA_BUCKET=gs://${BUCKET}"
```

Then grant invoke (the binding in step 3 that needs the job to exist):

```bash
gcloud run jobs add-iam-policy-binding lacus-ingest \
  --region="${REGION}" \
  --member="serviceAccount:lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --role=roles/run.invoker
```

### 6. Run it once by hand (sanity check)

```bash
gcloud run jobs execute lacus-ingest --region="${REGION}" --wait
```

When it finishes, both lakes' manifests should show a fresh `generatedAt`:

```bash
curl -s "https://storage.googleapis.com/${BUCKET}/lake-lucerne/manifest.json"
curl -s "https://storage.googleapis.com/${BUCKET}/lake-zurich/manifest.json"
```

### 7. Schedule it (once)

Three times a day, 06:00 / 12:00 / 18:00 Europe/Zurich:

```bash
gcloud scheduler jobs create http lacus-ingest-3x \
  --location="${REGION}" \
  --schedule="0 6,12,18 * * *" \
  --time-zone="Europe/Zurich" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT}/jobs/lacus-ingest:run" \
  --http-method=POST \
  --oauth-service-account-email="lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  || echo "scheduler job already exists"
```

The first 3 Scheduler jobs are free.

## After deploy

Merge the "Serve timetable data from the GCS bucket" PR so the live site reads from
`https://storage.googleapis.com/lacus-data/` instead of the committed `public/data` copy.
The committed `public/data` stays as a harmless safety net until you drop it.

## Notes

- The image does **not** run `scrape:sgv` / `scrape:zsg`. Those write to `src/data/scraped/`
  (committed, used by the vessel resolver), not to the data package. Folding them onto this
  job is a later, separate change.
- If the official feed layout changes, `build:data` exits non-zero and the job is marked
  failed. Check **Cloud Run → Jobs → lacus-ingest → Executions** for the log.
- Adding a lake: add it to `pipeline/lakes.ts` (and its photo/pier names in the app),
  rebuild and update the job (`gcloud builds submit` + `gcloud run jobs update`), and the
  next scheduled run publishes it.
