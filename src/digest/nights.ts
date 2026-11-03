import { readdirSync } from 'node:fs';
import { readNight } from './read.js';
import type { NightDigest, RunStatus } from './types.js';

const NIGHT_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.jsonl$/;
const NIGHT_LENGTH = 'YYYY-MM-DD'.length;

/** Counts the night's parsed log lines by status (every attempt, so retries are never hidden by a later ok). */
export type StatusCounts = Record<RunStatus, number>;

/** A night on disk and its counts; `counts` is `null` when the file vanished before it was read. */
export type NightSummary = {
  night: string;
  counts: StatusCounts | null;
};

/** Nights on disk = `<runsDir>/<YYYY-MM-DD>.jsonl`, newest first. A missing runs dir gives none. */
export function nightsOnDisk(runsDir: string): string[] {
  let files: string[];
  try {
    files = readdirSync(runsDir);
  } catch {
    return [];
  }
  return files
    .filter((file) => NIGHT_FILE_PATTERN.test(file))
    .map((file) => file.slice(0, NIGHT_LENGTH))
    .sort()
    .reverse();
}

export function countByLogLine(digest: NightDigest): StatusCounts {
  const counts: StatusCounts = { ok: 0, retry: 0, fail: 0 };
  for (const row of digest.rows) {
    counts.ok += row.runs - row.retries - row.fails;
    counts.retry += row.retries;
    counts.fail += row.fails;
  }
  return counts;
}

export function listNights(runsDir: string): NightSummary[] {
  return nightsOnDisk(runsDir).map((night) => {
    const digest = readNight(runsDir, night);
    return { night, counts: digest === null ? null : countByLogLine(digest) };
  });
}
