# Ingestion job image: builds the per-lake timetable packages from the latest official GTFS and
# publishes them to the data bucket. Built by Cloud Build (see deploy/README.md), run as a Cloud
# Run Job on a schedule. Node 24 to match the repo (the pipeline runs .ts files directly).
FROM node:24-bookworm-slim

# gcloud CLI so the job can upload to the bucket with its service-account credentials (ADC).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg git \
 && install -m 0755 -d /usr/share/keyrings \
 && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
 && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-cloud-cli \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first for layer caching. build:data needs csv-parse + yauzl (declared as
# devDependencies), so a full install is required — do not use --omit=dev here.
COPY package.json package-lock.json ./
RUN npm ci

# Only what the pipeline needs at runtime.
COPY pipeline ./pipeline
COPY src ./src
COPY deploy/publish.sh ./deploy/publish.sh
RUN chmod +x deploy/publish.sh

ENV DATA_BUCKET=gs://lacus-data
CMD ["./deploy/publish.sh"]
