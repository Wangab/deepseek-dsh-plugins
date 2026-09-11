/**
 * Pure git-branch resolution for the show-git-branch host route.
 *
 * Reads the repository's `.git/HEAD` directly instead of spawning git: the
 * file is tiny, local, and always present in a working tree. Discovery walks
 * upward from the requested directory exactly like git does, so a workspace
 * that is a subdirectory of a repository still reports the repository's
 * branch. Every failure mode collapses to `{ branch: null }` — the browser
 * chip hides rather than rendering a broken control.
 */

import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

/** HEAD prefix naming the symbolic ref of the current branch. */
const REF_PREFIX = 'ref: refs/heads/'
/** `.git` file prefix naming the real metadata directory (worktrees, submodules). */
const GITDIR_PREFIX = 'gitdir:'
/** A full lowercase-or-uppercase hex object id, as a detached HEAD holds. */
const COMMIT_ID = /^[0-9a-f]{40}$/i
/** Abbreviated id length shown for a detached HEAD. */
const SHORT_ID_LENGTH = 7

/** The no-branch result: the directory does not resolve to a usable repository. */
const NONE = Object.freeze({ branch: null, detached: false })

/**
 * Read one file as UTF-8 text.
 * @param {string} path - absolute file path.
 * @returns {Promise<string | null>} the text, or null when unreadable.
 */
async function readTextFile(path) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    // Any read failure (missing, permission, directory) means the same thing
    // here: there is no HEAD to parse.
    return null
  }
}

/**
 * Parse one `.git/HEAD` file body.
 * @param {string | null} content - the HEAD text, or null when unreadable.
 * @returns {{ branch: string | null, detached: boolean }} the resolved branch.
 */
function parseHead(content) {
  if (typeof content !== 'string') return NONE
  const line = content.split('\n', 1)[0].trim()
  if (line.startsWith(REF_PREFIX)) {
    const name = line.slice(REF_PREFIX.length).trim()
    // A branch name is one path-like token; anything else is not a name.
    return name !== '' && !name.includes(' ') ? { branch: name, detached: false } : NONE
  }
  if (COMMIT_ID.test(line)) {
    return { branch: line.slice(0, SHORT_ID_LENGTH).toLowerCase(), detached: true }
  }
  return NONE
}

/**
 * Read the HEAD of the repository metadata sitting inside one directory.
 * @param {string} dir - candidate working directory.
 * @returns {Promise<{ branch: string | null, detached: boolean } | null>} the
 * branch result, or null when the directory holds no `.git` entry (the caller
 * keeps walking upward).
 */
async function readHeadAt(dir) {
  let gitStat
  try {
    gitStat = await stat(join(dir, '.git'))
  } catch {
    // No .git entry here (or it is unreadable): not this directory's metadata.
    return null
  }
  if (gitStat.isDirectory()) {
    return parseHead(await readTextFile(join(dir, '.git', 'HEAD')))
  }
  if (gitStat.isFile()) {
    const pointer = await readTextFile(join(dir, '.git'))
    if (pointer !== null && pointer.trimStart().startsWith(GITDIR_PREFIX)) {
      const target = resolve(dir, pointer.trimStart().slice(GITDIR_PREFIX.length).trim())
      return parseHead(await readTextFile(join(target, 'HEAD')))
    }
    return NONE
  }
  return NONE
}

/**
 * Resolve the current git branch of a directory, discovering the enclosing
 * repository by walking upward like git does.
 * @param {string} startDir - absolute directory to resolve.
 * @returns {Promise<{ branch: string | null, detached: boolean }>} the branch
 * name (abbreviated commit id for a detached HEAD), or null branch when the
 * directory is not inside a usable repository.
 */
export async function resolveGitBranch(startDir) {
  let dir = resolve(startDir)
  while (true) {
    const found = await readHeadAt(dir)
    if (found !== null) return found
    const parent = dirname(dir)
    if (parent === dir) return NONE
    dir = parent
  }
}
