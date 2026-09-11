import { readGitBranch } from './git.mjs';

function badRequest(message, path = []) {
  return {
    ok: false,
    error: { code: 'bad-request', message, details: { issues: [{ code: 'custom', path, message }] } },
  };
}

/** Connection owns transport trust; workspaceRegistry owns header-validated membership. */
export function createBranchHandler({ workspaceRegistry }, readBranch = readGitBranch) {
  return async (endpoint, payload, signal) => {
    if (endpoint !== 'branch') return badRequest('Unknown endpoint');
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)
      || Reflect.ownKeys(payload).length !== 1 || !Object.hasOwn(payload, 'sessionId')
      || typeof payload.sessionId !== 'string' || payload.sessionId.trim().length === 0
      || payload.sessionId.length > 512) {
      return badRequest('Expected only a nonempty sessionId of at most 512 characters', ['sessionId']);
    }
    try {
      if (signal?.aborted) return { ok: true, value: null };
      const workspace = workspaceRegistry.list().find(workspace => workspace.sessionIds.includes(payload.sessionId));
      const value = workspace ? await readBranch(workspace.path, { signal }) : null;
      return { ok: true, value: signal?.aborted ? null : value };
    } catch {
      return { ok: true, value: null };
    }
  };
}
