#!/usr/bin/env bash
# Builds every lake's timetable package from the latest official GTFS and publishes the changed
# files to the data bucket. Run by the GitHub Actions ingestion workflow (see deploy/README.md
# and .github/workflows/ingest-data.yml). Expects DATA_BUCKET in the environment (e.g.
# gs://lacus-data) and uses the workflow's Workload-Identity-Federated credentials (ADC) for
# gcloud, so no keys are needed.
#
# Each lake is built AND published before moving to the next. No top-level `set -e`: one lake's
# build failure (a bad operator match, an upstream feed quirk) must not block the others from
# publishing their already-good data. Failures are collected and fail the job at the end, after
# every lake that could publish did.
set -uo pipefail

: "${DATA_BUCKET:?set DATA_BUCKET, e.g. gs://lacus-data}"

OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Lakes are enumerated from pipeline/lakes.ts, so adding a lake there needs no change here.
LAKES="$(node --disable-warning=ExperimentalWarning -e 'import("./pipeline/lakes.ts").then((m) => console.log(Object.keys(m.LAKES).join(" ")))')"
echo "Lakes: ${LAKES}"

FAILED=""
for lake in ${LAKES}; do
  echo "== Building ${lake} timetable =="
  if ! npm run build:data -- --lake "${lake}" --out "${OUT}"; then
    echo "!! ${lake} timetable failed to build; skipping its publish, continuing with the rest." >&2
    FAILED="${FAILED} ${lake}"
    continue
  fi

  # Which boat sails which trip, from whatever this lake's scraper last committed - not required
  # for the lake to work at all (see src/utils/vesselResolver.ts), so a failure here only drops
  # boat names for a while, never blocks the timetable itself from publishing.
  echo "== Building ${lake} vessels =="
  if ! npm run build:vessels -- --lake "${lake}" --out "${OUT}"; then
    echo "!! ${lake} vessels failed to build; publishing the timetable without it." >&2
  fi

  echo "== Publishing ${lake} to ${DATA_BUCKET}/${lake} =="
  # Upload changed files only (rsync skips identical ones). No --delete-unmatched: content-hashed
  # files are immutable, and keeping the previous one lets in-flight downloads finish. Both the
  # timetable and vessels files (when built) land in the same output dir, so one rsync covers both.
  if ! gcloud storage rsync --recursive "${OUT}/${lake}" "${DATA_BUCKET}/${lake}"; then
    echo "!! ${lake} failed to publish." >&2
    FAILED="${FAILED} ${lake}"
    continue
  fi

  # Cache policy: the tiny manifests are re-checked often; the hashed data files never change in
  # place. Best-effort (|| true) so a transient metadata hiccup, or a lake with no vessels file
  # yet, does not fail an otherwise-good publish.
  gcloud storage objects update "${DATA_BUCKET}/${lake}/timetable.*.json" \
    --cache-control="public, max-age=31536000, immutable" || true
  gcloud storage objects update "${DATA_BUCKET}/${lake}/manifest.json" \
    --cache-control="public, max-age=300, must-revalidate" || true
  gcloud storage objects update "${DATA_BUCKET}/${lake}/vessels.*.json" \
    --cache-control="public, max-age=31536000, immutable" || true
  gcloud storage objects update "${DATA_BUCKET}/${lake}/vessels-manifest.json" \
    --cache-control="public, max-age=300, must-revalidate" || true
done

if [ -n "${FAILED}" ]; then
  echo "Done, but these lakes did NOT publish:${FAILED}" >&2
  exit 1
fi
echo "Done."
