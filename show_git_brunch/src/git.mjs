import { execFile } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

/** Read only the trusted workspace's branch; failures deliberately hide the label. */
export async function readGitBranch(cwd, { signal } = {}) {
  try {
    if (typeof cwd !== 'string' || !isAbsolute(cwd) || signal?.aborted) return null;
    // Git's inherited repository/config overrides must not redirect this lookup.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    const options = { cwd, env, signal, shell: false, windowsHide: true, encoding: 'utf8', timeout: 1500, maxBuffer: 16 * 1024 };
    const run = async args => (await execute('git', args, options)).stdout.trim();
    if (await run(['rev-parse', '--is-inside-work-tree']) !== 'true') return null;
    try {
      const ref = await run(['symbolic-ref', '--quiet', 'HEAD']);
      return ref.startsWith('refs/heads/') && ref.length > 'refs/heads/'.length
        ? { kind: 'branch', name: ref.slice('refs/heads/'.length) }
        : null;
    } catch (error) {
      // Exit 1 means a non-symbolic HEAD. Other failures are not detached HEAD.
      if (error.code !== 1 || error.killed || signal?.aborted) return null;
    }
    const name = await run(['rev-parse', '--short', 'HEAD']);
    return /^[0-9a-f]{4,64}$/i.test(name) ? { kind: 'detached', name } : null;
  } catch {
    return null;
  }
}
