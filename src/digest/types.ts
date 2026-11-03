export const RUN_STATUSES = ['ok', 'retry', 'fail'] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

/** One line of `runs/<night>.jsonl`, after parsing. A missing `owner` parses as `null`. */
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/**
 * One job of the night. Times are the `at` strings from the log, offset kept, never converted.
 * `firstAt` / `lastAt` and `lastStatus` follow file order. `lastError` is the most recent `error`
 * the job logged, even if a later line succeeded; `null` when it never logged one.
 */
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

/**
 * A night that has a file. `rows` holds one row per job, sorted by job. An empty file gives
 * `{ rows: [], badLines: 0 }` ("nothing ran"). `badLines` counts non-blank lines that are not
 * valid JSON or not a valid `RunLine`; they never throw.
 */
export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
};

/**
 * Reads `<runsDir>/<night>.jsonl`. Returns `null` when the night has no file, or when `night` is
 * not a `YYYY-MM-DD` date (so a route can answer 404 for both). Other read errors throw.
 */
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
