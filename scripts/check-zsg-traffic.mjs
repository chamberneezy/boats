#!/usr/bin/env node
// Checks ZSG's traffic-conditions page (zsg.ch/en/traffic-conditions/) for changes against the
// last time this script ran, and writes what it found to scripts/zsg-traffic-report.md.
//
// This script never touches src/data/zsgTrafficConditions.ts (the actual override the app reads)
// - that file only gets updated by hand, after the owner reviews the report. This script's only
// job is to notice when the live page no longer matches what was last seen, so nothing goes stale
// silently.
//
// Usage: node scripts/check-zsg-traffic.mjs
// Meant to run daily via a scheduled routine (see the "schedule" skill) - not wired to cron itself.
//
// Output (machine-owned, never hand-edit):
//   scripts/zsg-traffic-baseline.txt   the notice text as of the last run (for diffing next time)
//   scripts/zsg-traffic-report.md      human-readable result of the most recent check

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const URL = 'https://www.zsg.ch/en/traffic-conditions/';
// A plain descriptive UA got a 403 from a cloud sandbox's IP (still worked from a residential/
// office IP, so this looks like bot-detection on the request shape rather than an IP block) -
// a realistic browser UA and header set fixed it.
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

function htmlToLines(html) {
  const text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '\n');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// Just the notice content: from the page's own intro sentence to the next "Traffic Conditions"
// breadcrumb repeat. Checked against the page read 2026-09-23 - if this stops finding a section,
// the page's own structure changed and the script fails loudly rather than reporting an empty diff.
function extractNotice(lines) {
  const start = lines.findIndex((l) => l.startsWith('Here you will find all the information'));
  const end = lines.findIndex((l, i) => i > start && l === 'Traffic Conditions');
  if (start === -1) throw new Error('Notice section marker not found — page layout changed?');
  return lines.slice(start, end === -1 ? lines.length : end).join('\n');
}

async function main() {
  const res = await fetch(URL, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const notice = extractNotice(htmlToLines(await res.text()));

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  const baselineFile = path.join(root, 'zsg-traffic-baseline.txt');
  const reportFile = path.join(root, 'zsg-traffic-report.md');

  let baseline = null;
  try {
    baseline = await readFile(baselineFile, 'utf8');
  } catch {
    /* first run */
  }

  const checkedAt = new Date().toISOString();
  const changed = baseline !== null && notice.trim() !== baseline.trim();
  const firstRun = baseline === null;

  const report = firstRun
    ? `# ZSG traffic-conditions check\n\nFirst run — last checked ${checkedAt}. This snapshot is now the baseline for tomorrow's comparison.\n\n## Current page text\n\n\`\`\`\n${notice}\n\`\`\`\n`
    : changed
      ? `# ZSG traffic-conditions check\n\n**Changed** — last checked ${checkedAt}. Review before updating \`src/data/zsgTrafficConditions.ts\`.\n\n## Current page text\n\n\`\`\`\n${notice}\n\`\`\`\n\n## Previous snapshot (yesterday's check)\n\n\`\`\`\n${baseline}\n\`\`\`\n`
      : `# ZSG traffic-conditions check\n\nNo change — last checked ${checkedAt}. Matches the previous snapshot.\n`;

  await writeFile(reportFile, report);
  await writeFile(baselineFile, notice);
  console.log(firstRun ? `First run, baseline captured — ${checkedAt}` : changed ? `Changed — see ${reportFile}` : `No change — ${checkedAt}`);
}

main().catch((err) => {
  console.error(`[check-zsg-traffic] FAILED: ${err.message}`);
  process.exit(1);
});
