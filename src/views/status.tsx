import { MISSING } from '../digest/read.js';
import { RUN_STATUSES } from '../digest/types.js';
import type { Status } from '../status.js';

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      <p class="mute">log lines by status</p>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <table>
          <thead>
            <tr><th>night</th>{RUN_STATUSES.map((runStatus) => <th>{runStatus}</th>)}</tr>
          </thead>
          <tbody>
            {status.nights.map(({ night, counts }) => (
              <tr>
                <td><a href={`/digest/${night}`}>{night}</a></td>
                {RUN_STATUSES.map((runStatus) => <td>{counts === null ? MISSING : counts[runStatus]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
