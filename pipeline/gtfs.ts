// Streaming access to the official Swiss GTFS zip. The big files (stop_times is ~3 GB) are never
// loaded whole: each is read line by line and only rows of interest are parsed.

import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import { parse } from 'csv-parse/sync';
import yauzl from 'yauzl';

function openEntryStream(zipPath: string, entryName: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (openError, zip) => {
      if (openError) return reject(openError);
      zip.on('entry', (entry) => {
        if (entry.fileName !== entryName) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          stream.on('close', () => zip.close());
          resolve(stream);
        });
      });
      zip.on('end', () => reject(new Error(`${entryName} not found in ${zipPath}`)));
      zip.readEntry();
    });
  });
}

function parseLine(line: string): string[] {
  return (parse(line, { relax_quotes: true, relax_column_count: true }) as string[][])[0] ?? [];
}

// First column of a CSV line without a full parse: cheap enough to test 30 million lines.
function firstField(line: string): string {
  if (line.charCodeAt(0) === 34) return line.slice(1, line.indexOf('"', 1));
  const comma = line.indexOf(',');
  return comma < 0 ? line : line.slice(0, comma);
}

export type Row = Record<string, string>;

/**
 * Reads one file of the feed. `keep` looks at the first column only and decides whether a row is
 * parsed at all; `onRow` receives the parsed rows. Returns how many rows were kept.
 */
export async function readTable(
  zipPath: string,
  entryName: string,
  keep: (firstColumn: string) => boolean,
  onRow: (row: Row) => void,
): Promise<number> {
  const lines = createInterface({ input: await openEntryStream(zipPath, entryName), crlfDelay: Infinity });
  let header: string[] | null = null;
  let kept = 0;
  for await (const raw of lines) {
    if (!header) {
      header = parseLine(raw.replace(/^﻿/, ''));
      continue;
    }
    if (!raw || !keep(firstField(raw))) continue;
    const cells = parseLine(raw);
    onRow(Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ''])));
    kept++;
  }
  return kept;
}
