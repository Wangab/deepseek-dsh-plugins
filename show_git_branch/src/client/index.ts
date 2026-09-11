/**
 * show-git-branch, browser half: one compact chip on the composer's
 * `conversation.input.left` seat — the extension point immediately right of
 * the mode selector — showing the session workspace's current git branch.
 * The branch fact is fetched from the host half's route and published through
 * one snapshot store keyed by directory, so Sessions sharing a workspace
 * share the truth. Focus events and a slow interval keep it current; the
 * component resolves a directory on first sight.
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input.left seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the ui-renderer Context merge (ctx.slots binding).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ui-session standard-props merge (useSessions).
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the client timer service's Context mixin (ctx.setInterval).
import type {} from '@deepseek-ai/dsh-cordis-client-runner/client'
import { GitBranchChip } from './GitBranchChip.tsx'
import { createGitBranchController, type BranchState } from './controller.mjs'
import { ensureStyles } from './styles.mjs'
import { en, NS, zh } from './locales.mjs'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The composer git-branch chip's copy. */
    'show-git-branch': string
  }
}

/** One directory's branch state, as the controller publishes it. */
export type { BranchState } from './controller.mjs'

/** Injected business face of the composer git-branch chip. */
export interface GitBranchInjected {
  /** Bare branch-state source; the renderer binds it to the useGitBranches selector hook. */
  hooks: { gitBranches: SnapshotStore<Readonly<Record<string, BranchState>>> }
  /**
   * Resolve one directory's branch now.
   * @param cwd - the session's absolute workspace directory.
   */
  refreshBranch: (cwd: string) => Promise<void>
}

/** How often every known directory re-reads its branch, in milliseconds. */
const REFRESH_INTERVAL_MS = 30_000

/** Required services: the seat's slot registry and the locale registry. */
export const inject = ['slots', 'locale', 'timer']

/**
 * Client plugin body: install the stylesheet and dictionaries, then register
 * the chip on the composer's input-left seat.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ensureStyles()
  const controller = createGitBranchController({
    createStore: (init: Record<string, BranchState>) => createSnapshotStore(init),
  })

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'show-git-branch: dictionaries')

  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'show-git-branch',
    order: 10,
    locale: NS,
    inject: (): GitBranchInjected => ({
      hooks: { gitBranches: controller.branches },
      refreshBranch: controller.refresh,
    }),
  }, GitBranchChip))

  // Slow polling keeps the chip honest while the terminal (or the agent)
  // moves the repository between branches out-of-band.
  ctx.setInterval(() => { controller.refreshAll() }, REFRESH_INTERVAL_MS)

  // Returning to the page is the other moment a checkout likely happened.
  const onFocus = (): void => { controller.refreshAll() }
  window.addEventListener('focus', onFocus)
  ctx.effect(() => () => { window.removeEventListener('focus', onFocus) }, 'show-git-branch: focus refresh')
}
