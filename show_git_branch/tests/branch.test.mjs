import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { resolveGitBranch } from '../host/git-branch.mjs'

/** Create a temp fixture directory and return its path plus a cleanup. */
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'show-git-branch-'))
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

/** Write a plain repository fixture: .git dir with a HEAD file. */
async function repo(dir, head) {
  await mkdir(join(dir, '.git'), { recursive: true })
  await writeFile(join(dir, '.git', 'HEAD'), head)
}

test('resolves the branch from .git/HEAD ref line', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, 'ref: refs/heads/main\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: 'main', detached: false })
  } finally {
    await cleanup()
  }
})

test('keeps hierarchical branch names intact', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, 'ref: refs/heads/feature/gts2-cms\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: 'feature/gts2-cms', detached: false })
  } finally {
    await cleanup()
  }
})

test('detached HEAD yields the abbreviated commit id', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, '0123456789abcdef0123456789abcdef01234567\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: '0123456', detached: true })
  } finally {
    await cleanup()
  }
})

test('a directory without .git reports no branch', async () => {
  const { dir, cleanup } = await fixture()
  try {
    assert.deepEqual(await resolveGitBranch(dir), { branch: null, detached: false })
  } finally {
    await cleanup()
  }
})

test('a subdirectory discovers the enclosing repository', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, 'ref: refs/heads/main\n')
    const sub = join(dir, 'packages', 'app')
    await mkdir(sub, { recursive: true })
    assert.deepEqual(await resolveGitBranch(sub), { branch: 'main', detached: false })
  } finally {
    await cleanup()
  }
})

test('a worktree .git file redirects through gitdir', async () => {
  const { dir, cleanup } = await fixture()
  try {
    const gitdir = join(dir, 'main-repo', '.git', 'worktrees', 'wt')
    await mkdir(gitdir, { recursive: true })
    await writeFile(join(gitdir, 'HEAD'), 'ref: refs/heads/wt-branch\n')
    const worktree = join(dir, 'wt')
    await mkdir(worktree, { recursive: true })
    await writeFile(join(worktree, '.git'), `gitdir: ${gitdir}\n`)
    assert.deepEqual(await resolveGitBranch(worktree), { branch: 'wt-branch', detached: false })
  } finally {
    await cleanup()
  }
})

test('a relative gitdir resolves against the worktree directory', async () => {
  const { dir, cleanup } = await fixture()
  try {
    const gitdir = join(dir, 'store')
    await mkdir(gitdir, { recursive: true })
    await writeFile(join(gitdir, 'HEAD'), 'ref: refs/heads/rel\n')
    const worktree = join(dir, 'wt')
    await mkdir(worktree, { recursive: true })
    await writeFile(join(worktree, '.git'), 'gitdir: ../store\n')
    assert.deepEqual(await resolveGitBranch(worktree), { branch: 'rel', detached: false })
  } finally {
    await cleanup()
  }
})

test('a garbage .git file reports no branch', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await writeFile(join(dir, '.git'), 'not a gitdir pointer\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: null, detached: false })
  } finally {
    await cleanup()
  }
})

test('a garbage HEAD line reports no branch', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, 'sounds good to me\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: null, detached: false })
  } finally {
    await cleanup()
  }
})

test('an empty HEAD file reports no branch', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, '')
    assert.deepEqual(await resolveGitBranch(dir), { branch: null, detached: false })
  } finally {
    await cleanup()
  }
})

test('uppercase hex HEAD is still a detached commit id', async () => {
  const { dir, cleanup } = await fixture()
  try {
    await repo(dir, 'ABCDEF0123456789ABCDEF0123456789ABCDEF01\n')
    assert.deepEqual(await resolveGitBranch(dir), { branch: 'abcdef0', detached: true })
  } finally {
    await cleanup()
  }
})
