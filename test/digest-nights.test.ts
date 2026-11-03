import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { listNights, nightsOnDisk } from '../src/digest/nights.js';

const RUNS_DIR = 'runs';

const tempDir = mkdtempSync(join(tmpdir(), 'rig-nights-'));
afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

describe('listNights', () => {
  it('lists the nights in runs/ newest first, counting log lines by status', () => {
    expect(listNights(RUNS_DIR)).toEqual([
      { night: '2026-10-28', counts: { ok: 10, retry: 4, fail: 1 } },
      { night: '2026-10-27', counts: { ok: 7, retry: 0, fail: 0 } },
    ]);
  });

  it('ignores files that are not night logs and gives zero counts for an empty night', () => {
    writeFileSync(join(tempDir, '2026-01-01.jsonl'), '');
    writeFileSync(join(tempDir, 'notes.txt'), '');
    writeFileSync(join(tempDir, '2026-01-02.json'), '');
    expect(listNights(tempDir)).toEqual([{ night: '2026-01-01', counts: { ok: 0, retry: 0, fail: 0 } }]);
  });

  it('gives no nights for a missing runs dir', () => {
    expect(nightsOnDisk(join(tempDir, 'missing'))).toEqual([]);
  });
});
