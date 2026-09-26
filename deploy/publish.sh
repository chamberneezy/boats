#!/usr/bin/env bash
# Builds every lake's timetable package from the latest official GTFS and publishes the changed
# files to the data bucket. Run by the Cloud Run job (see deploy/README.md). Expects DATA_BUCKET
# in the environment (e.g. gs://lacus-data) and uses the job's service-account credentials (ADC)
# for gcloud, so no keys are needed.
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
  echo "== Building ${lake} =="
  if ! npm run build:data -- --lake "${lake}" --out "${OUT}"; then
    echo "!! ${lake} failed to build; skipping its publish, continuing with the rest." >&2
    FAILED="${FAILED} ${lake}"
    continue
  fi

  echo "== Publishing ${lake} to ${DATA_BUCKET}/${lake} =="
  # Upload changed files only (rsync skips identical ones). No --delete-unmatched: content-hashed
  # timetable files are immutable, and keeping the previous one lets in-flight downloads finish.
  if ! gcloud storage rsync --recursive "${OUT}/${lake}" "${DATA_BUCKET}/${lake}"; then
    echo "!! ${lake} failed to publish." >&2
    FAILED="${FAILED} ${lake}"
    continue
  fi

  # Cache policy: the tiny manifest is re-checked often; the hashed timetable never changes in
  # place. Best-effort (|| true) so a transient metadata hiccup does not fail an otherwise-good
  # publish.
  gcloud storage objects update "${DATA_BUCKET}/${lake}/timetable.*.json" \
    --cache-control="public, max-age=31536000, immutable" || true
  gcloud storage objects update "${DATA_BUCKET}/${lake}/manifest.json" \
    --cache-control="public, max-age=300, must-revalidate" || true
done

if [ -n "${FAILED}" ]; then
  echo "Done, but these lakes did NOT publish:${FAILED}" >&2
  exit 1
fi
echo "Done."
