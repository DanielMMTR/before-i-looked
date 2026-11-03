import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const OK = 200;
const NOT_FOUND = 404;

const NORMAL_NIGHT = '2026-10-28';
const MISSING_NIGHT = '2026-10-01';
const EMPTY_NIGHT = '2026-10-02';
const BAD_LINE_NIGHT = '2026-10-03';
const NORMAL_JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];
const NORMAL_BAD_LINES = 1;

const GOOD_LINE_A = JSON.stringify({ at: '2026-10-03T23:00:00+01:00', job: 'alpha/one', status: 'ok', owner: 'rook' });
const GOOD_LINE_B = JSON.stringify({ at: '2026-10-03T23:05:00+01:00', job: 'beta/two', status: 'fail', owner: null, error: 'boom' });
const BAD_LINE = '{"at": not json';
const BAD_LINE_NIGHT_JOBS = ['alpha/one', 'beta/two'];

const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

function nightFile(night: string): string {
  return join(runsDir, `${night}.jsonl`);
}

writeFileSync(nightFile(NORMAL_NIGHT), readFileSync(join('runs', `${NORMAL_NIGHT}.jsonl`), 'utf8'));
writeFileSync(nightFile(EMPTY_NIGHT), '');
writeFileSync(nightFile(BAD_LINE_NIGHT), [GOOD_LINE_A, BAD_LINE, GOOD_LINE_B, ''].join('\n'));

const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });

type DigestJson = { night: string; rows: DigestRow[]; badLines: number };

async function page(night: string) {
  const res = await app.request(`/digest/${night}`);
  return { status: res.status, html: await res.text() };
}

async function api(night: string) {
  const res = await app.request(`/api/digest/${night}`);
  return { status: res.status, body: (await res.json()) as DigestJson };
}

function jobsInPage(html: string): string[] {
  return [...html.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((match) => match[1] ?? '');
}

describe('GET /digest/:night', () => {
  it('renders a normal night with every job and the bad line count', async () => {
    const { status, html } = await page(NORMAL_NIGHT);
    expect(status).toBe(OK);
    expect(html).toContain(`digest · ${NORMAL_NIGHT}`);
    expect(html).toContain(`bad lines: ${NORMAL_BAD_LINES}`);
    expect(jobsInPage(html)).toEqual(NORMAL_JOBS);
  });

  it('answers 404 for a night with no file', async () => {
    const { status, html } = await page(MISSING_NIGHT);
    expect(status).toBe(NOT_FOUND);
    expect(html).toContain('no run log for this night');
  });

  it('shows "nothing ran" for an empty night', async () => {
    const { status, html } = await page(EMPTY_NIGHT);
    expect(status).toBe(OK);
    expect(html).toContain('nothing ran');
    expect(html).toContain('bad lines: 0');
    expect(html).not.toContain('<table>');
  });

  it('still renders a night with a bad line, counting it and keeping the other rows', async () => {
    const { status, html } = await page(BAD_LINE_NIGHT);
    expect(status).toBe(OK);
    expect(html).toContain('bad lines: 1');
    expect(jobsInPage(html)).toEqual(BAD_LINE_NIGHT_JOBS);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns a normal night with every job and the bad line count', async () => {
    const { status, body } = await api(NORMAL_NIGHT);
    expect(status).toBe(OK);
    expect(body.night).toBe(NORMAL_NIGHT);
    expect(body.badLines).toBe(NORMAL_BAD_LINES);
    expect(body.rows.map((row) => row.job)).toEqual(NORMAL_JOBS);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request(`/api/digest/${MISSING_NIGHT}`);
    expect(res.status).toBe(NOT_FOUND);
    expect(await res.json()).toEqual({ error: 'no digest for this night', night: MISSING_NIGHT });
  });

  it('returns 200 with no rows for an empty night', async () => {
    const { status, body } = await api(EMPTY_NIGHT);
    expect(status).toBe(OK);
    expect(body).toEqual({ night: EMPTY_NIGHT, rows: [], badLines: 0 });
  });

  it('still returns a night with a bad line, counting it and keeping the other rows', async () => {
    const { status, body } = await api(BAD_LINE_NIGHT);
    expect(status).toBe(OK);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row) => row.job)).toEqual(BAD_LINE_NIGHT_JOBS);
  });
});

describe('page and JSON agree (ADR 0001)', () => {
  it.each([NORMAL_NIGHT, BAD_LINE_NIGHT])('list the same jobs in the same order for %s', async (night) => {
    const { html } = await page(night);
    const { body } = await api(night);
    expect(jobsInPage(html)).toEqual(body.rows.map((row) => row.job));
  });
});
