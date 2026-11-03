import { MISSING, ownerLabel } from '../digest/read.js';
import type { DigestRow, NightDigest } from '../digest/types.js';

const RETRIES_WARN_AT = 3;

function needsAttention(row: DigestRow): boolean {
  return row.retries >= RETRIES_WARN_AT || row.lastStatus === 'fail';
}

function DigestTable({ rows }: { rows: DigestRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>job</th>
          <th>owner</th>
          <th>runs</th>
          <th>retries</th>
          <th>last status</th>
          <th>last error</th>
          <th>first at</th>
          <th>last at</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr class={needsAttention(row) ? 'warn' : undefined}>
            <td>{row.job}</td>
            <td>{ownerLabel(row.owner)}</td>
            <td>{row.runs}</td>
            <td>{row.retries}</td>
            <td>{row.lastStatus}</td>
            <td>{row.lastError ?? MISSING}</td>
            <td>{row.firstAt}</td>
            <td>{row.lastAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class={digest.badLines > 0 ? 'warn' : 'mute'}>bad lines: {digest.badLines}</p>
      {digest.rows.length === 0 ? <p class="mute">nothing ran</p> : <DigestTable rows={digest.rows} />}
    </>
  );
}

export function NightNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="warn">no run log for this night</p>
    </>
  );
}
