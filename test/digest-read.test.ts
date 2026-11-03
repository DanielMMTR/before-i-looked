import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MISSING, ownerLabel, parseRunLine, readNight } from '../src/digest/read.js';

const RUNS_DIR = 'runs';
const NIGHT = '2026-10-28';
const EXPECTED_JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

const tempDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

function digestOf(night: string) {
  const digest = readNight(RUNS_DIR, night);
  if (digest === null) throw new Error(`no digest for ${night}`);
  return digest;
}

function rowOf(job: string) {
  const row = digestOf(NIGHT).rows.find((r) => r.job === job);
  if (row === undefined) throw new Error(`no row for ${job}`);
  return row;
}

describe('readNight on runs/2026-10-28.jsonl', () => {
  it('gives one row per job, sorted by job, and counts the bad line', () => {
    const digest = digestOf(NIGHT);
    expect(digest.rows.map((r) => r.job)).toEqual(EXPECTED_JOBS);
    expect(digest.badLines).toBe(1);
  });

  it('aggregates runs, retries, last status and times with the offset kept', () => {
    expect(rowOf('lane/sync')).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      fails: 0,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });

  it('keeps the last error after a later success', () => {
    const row = rowOf('fixtures/refresh');
    expect(row.retries).toBe(3);
    expect(row.lastStatus).toBe('ok');
    expect(row.lastError).toBe('upstream 503');
  });

  it('reports a failed job', () => {
    expect(rowOf('notes/backup')).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    const row = rowOf('digest/render');
    expect(row.owner).toBeNull();
    expect(ownerLabel(row.owner)).toBe(MISSING);
  });
});

describe('readNight edges', () => {
  it('returns null for a night with no file', () => {
    expect(readNight(RUNS_DIR, '1999-01-01')).toBeNull();
  });

  it('returns null for a night that is not a date', () => {
    expect(readNight(RUNS_DIR, '../package')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    writeFileSync(join(tempDir, '2026-01-01.jsonl'), '');
    expect(readNight(tempDir, '2026-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts lines that parse as JSON but are not run lines', () => {
    writeFileSync(join(tempDir, '2026-01-02.jsonl'), '[]\n{"at":"x","job":"j","status":"maybe","owner":null}\n');
    expect(readNight(tempDir, '2026-01-02')).toEqual({ rows: [], badLines: 2 });
  });
});

describe('parseRunLine', () => {
  it('treats a missing owner as null', () => {
    expect(parseRunLine('{"at":"a","job":"j","status":"ok"}')).toEqual({ at: 'a', job: 'j', status: 'ok', owner: null });
  });
});
