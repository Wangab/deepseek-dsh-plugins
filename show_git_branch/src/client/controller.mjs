/**
 * Browser-side git-branch state for the show-git-branch chip.
 *
 * One controller owns a single snapshot store keyed by workspace directory,
 * so every Session sharing a directory reads the same truth. The store
 * factory, HTTP carrier, and host base arrive as injected dependencies: the
 * production wiring (`index.ts`) supplies `createSnapshotStore` from the
 * module table and the page origin, while tests supply doubles. Every failure
 * — HTTP error, network error, malformed payload — collapses to the `none`
 * state, which the chip renders as nothing at all.
 */

/** Route path shared with the host half. */
const BRANCH_ROUTE = '/show-git-branch/branch'

/**
 * Fetch and fold one directory's branch answer.
 * @param {string} cwd - absolute workspace directory.
 * @param {(input: string | URL, init?: RequestInit) => Promise<Response>} fetcher - HTTP carrier.
 * @param {() => string} hostBase - origin of the serving host.
 * @returns {Promise<BranchState>} the resolved state.
 */
async function fetchBranchState(cwd, fetcher, hostBase) {
  try {
    const response = await fetcher(
      new URL(`${BRANCH_ROUTE}?path=${encodeURIComponent(cwd)}`, hostBase()),
      { headers: { accept: 'application/json' } },
    )
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
    const payload = await response.json()
    if (payload === null || typeof payload !== 'object'
      || typeof payload.branch !== 'string' || typeof payload.detached !== 'boolean') {
      throw new Error('malformed branch payload')
    }
    return payload.branch === ''
      ? { status: 'none' }
      : { status: 'ok', branch: payload.branch, detached: payload.detached }
  } catch {
    return { status: 'none' }
  }
}

/**
 * Create the git-branch controller.
 *
 * @param {object} deps - injected dependencies.
 * @param {(init: unknown) => import('@deepseek-ai/dsh-client-store').SnapshotStore<Record<string, BranchState>>} deps.createStore
 *   snapshot-store factory (production: `createSnapshotStore`).
 * @param {(input: string | URL, init?: RequestInit) => Promise<Response>} [deps.fetcher]
 *   HTTP carrier; defaults to the global `fetch`.
 * @param {() => string} [deps.hostBase] - origin resolver; defaults to the page
 *   origin with the null-origin fallback for sandboxed documents.
 * @returns {{ branches: object, refresh: (cwd: string) => Promise<void>, refreshAll: () => void }}
 *   the store plus the refresh entry points.
 */
export function createGitBranchController(deps) {
  const fetcher = deps.fetcher ?? ((input, init) => fetch(input, init))
  const hostBase = deps.hostBase ?? (() => {
    const origin = globalThis.location?.origin
    return origin !== undefined && origin !== 'null' ? origin : 'http://dsh.internal'
  })
  const branches = deps.createStore({})
  const inflight = new Map()

  /**
   * Replace one directory's state, merging into the current snapshot.
   * @param {string} cwd - directory key.
   * @param {BranchState} state - next state.
   */
  const publish = (cwd, state) => {
    branches.set({ ...branches.getSnapshot(), [cwd]: state })
  }

  /**
   * Refresh one directory's branch; concurrent calls share a single fetch.
   * @param {string} cwd - absolute workspace directory.
   * @returns {Promise<void>} after the state is published.
   */
  const refresh = (cwd) => {
    if (cwd === undefined || cwd === '') return Promise.resolve()
    const pending = inflight.get(cwd)
    if (pending !== undefined) return pending
    publish(cwd, { status: 'loading' })
    const request = fetchBranchState(cwd, fetcher, hostBase)
      .then((state) => { publish(cwd, state) })
      .finally(() => { inflight.delete(cwd) })
    inflight.set(cwd, request)
    return request
  }

  /** Re-fetch every known directory (window focus and the slow interval). */
  const refreshAll = () => {
    for (const cwd of Object.keys(branches.getSnapshot())) void refresh(cwd)
  }

  return { branches, refresh, refreshAll }
}

/**
 * One directory's branch state.
 * @typedef {'loading' | { status: 'ok', branch: string, detached: boolean } | { status: 'none' }} BranchState
 */
