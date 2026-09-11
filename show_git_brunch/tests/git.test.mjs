import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readGitBranch } from '../src/git.mjs';

function git(cwd, ...args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  execFileSync('git', args, { cwd, env, stdio: 'inherit', timeout: 5000, windowsHide: true });
}
async function fixture(t, committed = false) {
  const root = await mkdtemp(join(tmpdir(), 'show-git-brunch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, 'repo');
  await mkdir(repo);
  git(repo, 'init', '--initial-branch=main');
  if (committed) git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'fixture');
  return { root, repo };
}

test('reads an unborn branch', async t => {
  const { repo } = await fixture(t);
  assert.deepEqual(await readGitBranch(repo), { kind: 'branch', name: 'main' });
});
test('reads normal, Unicode and slash branches from repository subdirectories', async t => {
  const { repo } = await fixture(t, true);
  const nested = join(repo, 'nested');
  await mkdir(nested);
  assert.deepEqual(await readGitBranch(nested), { kind: 'branch', name: 'main' });
  git(repo, 'checkout', '-b', '功能/分支');
  assert.deepEqual(await readGitBranch(nested), { kind: 'branch', name: '功能/分支' });
});
test('does not abbreviate a branch when another ref has the same short name', async t => {
  const { repo } = await fixture(t, true);
  git(repo, 'tag', 'main');
  assert.deepEqual(await readGitBranch(repo), { kind: 'branch', name: 'main' });
});

test('reads detached HEAD as a short hexadecimal commit', async t => {
  const { repo } = await fixture(t, true);
  git(repo, 'checkout', '--detach');
  const value = await readGitBranch(repo);
  assert.equal(value?.kind, 'detached');
  assert.match(value.name, /^[0-9a-f]{7,64}$/);
});
test('reads a linked worktree branch rather than the main checkout', async t => {
  const { root, repo } = await fixture(t, true);
  const linked = join(root, 'linked');
  git(repo, 'worktree', 'add', '-b', 'linked-branch', linked);
  assert.deepEqual(await readGitBranch(linked), { kind: 'branch', name: 'linked-branch' });
});
test('returns null for non-repositories, missing paths, files and relative directories', async t => {
  const { root } = await fixture(t);
  const file = join(root, 'file');
  await writeFile(file, 'not a directory');
  for (const path of [root, join(root, 'missing'), file, '.', '', undefined, 42]) {
    assert.equal(await readGitBranch(path), null);
  }
});
test('returns null for an already aborted query', async t => {
  const { repo } = await fixture(t);
  assert.equal(await readGitBranch(repo, { signal: AbortSignal.abort() }), null);
});
test('ignores inherited Git directory and worktree overrides', async t => {
  const { root, repo } = await fixture(t);
  const saved = { ...process.env };
  t.after(() => { for (const key of Object.keys(process.env)) if (/^GIT_/i.test(key)) delete process.env[key]; for (const [key, value] of Object.entries(saved)) if (/^GIT_/i.test(key)) process.env[key] = value; });
  process.env.GIT_DIR = join(root, 'wrong.git');
  process.env.GIT_WORK_TREE = root;
  process.env.GIT_CONFIG_COUNT = '1';
  process.env.GIT_CONFIG_KEY_0 = 'core.bare';
  process.env.GIT_CONFIG_VALUE_0 = 'true';
  assert.deepEqual(await readGitBranch(repo), { kind: 'branch', name: 'main' });
});
