import { useEffect } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge (the input.left seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { GitBranchInjected } from './index.ts'

/** Full input-left component props: runtime share (standard kit) & injected share & the locale seat. */
export type GitBranchChipProps =
  PropsRuntime<'conversation.input.left'> & InjectFace<GitBranchInjected> & PropsLocale<'show-git-branch'>

/** A minimal branch glyph drawn with primitives (circles plus a joining path). */
function BranchGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="4.25" cy="4.25" r="1.9" />
      <circle cx="4.25" cy="11.75" r="1.9" />
      <circle cx="11.75" cy="4.25" r="1.9" />
      <path d="M4.25 6.15v3.7" />
      <path d="M11.75 6.15v.85c0 1.33-1.07 2.4-2.4 2.4H4.25" />
    </svg>
  )
}

/**
 * The composer's git-branch chip: the session workspace's current branch,
 * rendered beside the mode selector. Renders nothing while the Session has no
 * workspace directory, the branch is still resolving, or the directory is not
 * inside a git repository — the seat stays visually empty instead of broken.
 * @param props - session runtime, injected controller face, and localized copy.
 * @returns the branch chip, or null when there is nothing to show.
 */
export function GitBranchChip({ sessionId, useSessions, useGitBranches, refreshBranch, t }: GitBranchChipProps) {
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const entry = useGitBranches(state => cwd === undefined || cwd === '' ? undefined : state[cwd])

  // First sight of a directory (mount or workspace switch) resolves it once;
  // focus and the slow interval in apply keep it current afterwards.
  useEffect(() => {
    if (cwd !== undefined && cwd !== '') refreshBranch(cwd)
  }, [cwd, refreshBranch])

  if (cwd === undefined || cwd === '') return null
  if (entry === undefined || entry.status !== 'ok') return null

  const title = entry.detached
    ? t('chip.tooltip.detached', { branch: entry.branch, path: cwd })
    : t('chip.tooltip', { branch: entry.branch, path: cwd })

  return (
    <span className="dsh-sgb-chip" title={title} aria-label={title}>
      <span className="dsh-sgb-icon">
        <BranchGlyph />
      </span>
      <span className="dsh-sgb-label">{entry.branch}</span>
    </span>
  )
}
