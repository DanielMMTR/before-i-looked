import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_STATUSES, type DigestRow, type ReadNight, type RunLine, type RunStatus } from './types.js';

export const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MISSING = '—';

const NIGHT_FILE_EXTENSION = '.jsonl';
const FILE_NOT_FOUND = 'ENOENT';

export function ownerLabel(owner: string | null): string {
  return owner ?? MISSING;
}

function isRunStatus(value: unknown): value is RunStatus {
  return RUN_STATUSES.some((status) => status === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRunLine(line: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { at, job, status, owner, error } = value;
  if (typeof at !== 'string' || typeof job !== 'string' || !isRunStatus(status)) return null;
  if (owner !== undefined && owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return { at, job, status, owner: owner ?? null, ...(error === undefined ? {} : { error }) };
}

function startRow(line: RunLine): DigestRow {
  return {
    job: line.job,
    owner: line.owner,
    runs: 0,
    retries: 0,
    lastStatus: line.status,
    lastError: null,
    firstAt: line.at,
    lastAt: line.at,
  };
}

function addLine(row: DigestRow, line: RunLine): void {
  row.owner = line.owner;
  row.runs += 1;
  if (line.status === 'retry') row.retries += 1;
  row.lastStatus = line.status;
  if (line.error !== undefined) row.lastError = line.error;
  row.lastAt = line.at;
}

function isFileNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === FILE_NOT_FOUND;
}

function readNightFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (isFileNotFound(error)) return null;
    throw error;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT_PATTERN.test(night)) return null;
  const text = readNightFile(join(runsDir, night + NIGHT_FILE_EXTENSION));
  if (text === null) return null;

  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseRunLine(raw);
    if (line === null) {
      badLines += 1;
      continue;
    }
    const row = rows.get(line.job) ?? startRow(line);
    addLine(row, line);
    rows.set(line.job, row);
  }

  const sorted = [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { rows: sorted, badLines };
};
