# Data ingestion (GitHub Actions)

Scheduled GitHub Actions workflow that builds the per-lake timetable packages from the latest
official GTFS and publishes them to `gs://lacus-data`. The live app reads from that bucket
(`VITE_DATA_BASE_URL` in `.env.production`). Users never see this URL.

The workflow (`.github/workflows/ingest-data.yml`) is already scheduled 3×/day. This doc covers
the one-time GCP setup that lets it authenticate to the bucket without a stored key (Workload
Identity Federation), plus the two GitHub repository variables it needs. Adding a lake later is
just adding it to `pipeline/lakes.ts`; the next scheduled run picks it up, no further setup here.

## What it does

1. Enumerates every lake in `pipeline/lakes.ts`.
2. Runs `npm run build:data -- --lake <id>` for each (downloads a new official GTFS only
   when the feed changed; publishes only when the resulting data changed).
3. `gcloud storage rsync`s the output to `gs://lacus-data`, lake by lake — one lake's build or
   publish failure doesn't block the others (see `deploy/publish.sh`).
4. Sets cache headers: hashed `timetable.*.json` is immutable (1 year); `manifest.json` is
   revalidated every 5 minutes.

## Cost

GitHub Actions minutes are free on this public repo. The only recurring cost is GCS storage for
the published data — a few cents a month. No Cloud Run, Cloud Build, Artifact Registry or Cloud
Scheduler involved.

## One-time GCP setup (Cloud Shell)

Replace `PROJECT` and `REPO` if different from below. The rest is copy-paste.

```bash
export PROJECT=lacus-app-509713
export BUCKET=lacus-data
export REPO="chamberneezy/boats" # <org-or-user>/<repo>, scopes the trust below
gcloud config set project "${PROJECT}"
```

### 1. Enable APIs (once)

```bash
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com
```

### 2. Service account (once)

The workflow only needs to write to the data bucket. Nothing else.

```bash
gcloud iam service-accounts create lacus-ingest \
  --display-name="Lacus data ingest" \
  || echo "SA already exists"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --role=roles/storage.objectAdmin
```

### 3. Workload Identity Federation (once)

Lets the GitHub Actions run impersonate the service account with a short-lived token — no JSON
key stored anywhere, scoped so only workflow runs from this exact repo can use it.

```bash
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions" \
  || echo "pool already exists"

gcloud iam workload-identity-pools providers create-oidc "github-actions" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Actions OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  || echo "provider already exists"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"

gcloud iam service-accounts add-iam-policy-binding \
  "lacus-ingest@${PROJECT}.iam.gserviceaccount.com" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}"
```

### 4. GitHub repository variables (once)

GitHub → repo → Settings → Secrets and variables → Actions → **Variables** tab (these are not
secrets — no key material, just resource names, safe in plain variables):

- `GCP_WIF_PROVIDER` — print it with:
  ```bash
  echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github-actions"
  ```
- `GCP_INGEST_SERVICE_ACCOUNT` — `lacus-ingest@${PROJECT}.iam.gserviceaccount.com`

### 5. Run it once by hand (sanity check)

GitHub → Actions tab → "Publish timetable data" → **Run workflow**. When it finishes, both
lakes' manifests should show a fresh `generatedAt`:

```bash
curl -s "https://storage.googleapis.com/${BUCKET}/lake-lucerne/manifest.json"
curl -s "https://storage.googleapis.com/${BUCKET}/lake-zurich/manifest.json"
```

The schedule in `.github/workflows/ingest-data.yml` takes over from here — no further setup.

## After setup

Merge the "Serve timetable data from the GCS bucket" PR so the live site reads from
`https://storage.googleapis.com/lacus-data/` instead of the committed `public/data` copy. The
committed `public/data` stays as a harmless safety net until you drop it.

## Notes

- The workflow does not run `scrape:sgv` / `scrape:zsg`. `scrape:sgv` has its own daily workflow
  (`.github/workflows/scrape-sgv.yml`), writing to committed `src/data/scraped/` (used by the
  vessel resolver). `scrape:zsg` is not scheduled anywhere yet.
- If the official feed layout changes, `build:data` exits non-zero for that lake; the run still
  publishes every other lake that succeeded, then fails at the end. Check the failed run's log
  under the Actions tab.
- Adding a lake: add it to `pipeline/lakes.ts` (and its photo/pier names in the app) — the next
  scheduled run publishes it, no other wiring needed.
