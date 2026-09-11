import test from 'node:test';
import assert from 'node:assert/strict';
import { createBranchHandler } from '../src/server.mjs';
import { apply, inject } from '../index.mjs';

const signal = new AbortController().signal;
const empty = { ok: true, value: null };

test('resolves only the matching header-validated workspace and forwards cancellation', async () => {
  const handler = createBranchHandler({ workspaceRegistry: { list: () => [
    { path: '/wrong', sessionIds: ['other'] }, { path: '/correct', sessionIds: ['known'] },
  ] } }, async (cwd, options) => {
    assert.equal(cwd, '/correct');
    assert.equal(options.signal, signal);
    return { kind: 'branch', name: 'main' };
  });
  assert.deepEqual(await handler('branch', { sessionId: 'known' }, signal), { ok: true, value: { kind: 'branch', name: 'main' } });
});
test('rejects malformed payloads before consulting the registry', async () => {
  const handler = createBranchHandler({ workspaceRegistry: { list() { assert.fail('must not access registry'); } } });
  const extraHidden = Object.defineProperty({ sessionId: 'known' }, 'cwd', { value: '/private' });
  for (const payload of [null, undefined, [], 'known', {}, { sessionId: '' }, { sessionId: ' '.repeat(2) }, { sessionId: 1 }, { sessionId: 'x'.repeat(513) }, { sessionId: 'known', cwd: '/private' }, Object.create({ sessionId: 'known' }), extraHidden, { sessionId: 'known', [Symbol('extra')]: true }]) {
    const result = await handler('branch', payload, signal);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'bad-request');
    assert.equal(typeof result.error.message, 'string');
    assert.ok(Array.isArray(result.error.details.issues));
    assert.ok(result.error.details.issues.length > 0);
    assert.equal(JSON.stringify(result).includes('/private'), false);
  }
});
test('rejects unknown endpoints with a closed bad-request result', async () => {
  const handler = createBranchHandler({ workspaceRegistry: { list() { assert.fail('must not access registry'); } } });
  const result = await handler('anything', { sessionId: 'known' }, signal);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'bad-request');
  assert.ok(Array.isArray(result.error.details.issues));
});
test('accepts maximum length session IDs and does not interpret them as paths', async () => {
  const id = 'x'.repeat(512);
  const handler = createBranchHandler({ workspaceRegistry: { list: () => [{ path: '/registered', sessionIds: [id] }] } }, async cwd => ({ kind: 'branch', name: cwd === '/registered' ? 'main' : 'wrong' }));
  assert.deepEqual(await handler('branch', { sessionId: id }, signal), { ok: true, value: { kind: 'branch', name: 'main' } });
});
test('unknown or unregistered sessions never query Git', async () => {
  let reads = 0;
  const handler = createBranchHandler({ workspaceRegistry: { list: () => [{ path: '/repo', sessionIds: ['other'] }] } }, async () => { reads++; return null; });
  assert.deepEqual(await handler('branch', { sessionId: '/arbitrary/path' }, signal), empty);
  assert.equal(reads, 0);
});
test('cancellation while Git is pending discards the late branch result', async () => {
  const controller = new AbortController();
  let resolveRead;
  const handler = createBranchHandler({ workspaceRegistry: { list: () => [{ path: '/repo', sessionIds: ['known'] }] } }, () => new Promise(resolve => { resolveRead = resolve; }));
  const pending = handler('branch', { sessionId: 'known' }, controller.signal);
  controller.abort();
  resolveRead({ kind: 'branch', name: 'stale' });
  assert.deepEqual(await pending, empty);
});

test('registry and Git failures return null without leaking diagnostics', async () => {
  for (const handler of [
    createBranchHandler({ workspaceRegistry: { list() { throw new Error('/secret'); } } }),
    createBranchHandler({ workspaceRegistry: { list: () => [{ path: '/repo', sessionIds: ['known'] }] } }, async () => { throw new Error('/secret'); }),
    createBranchHandler({ workspaceRegistry: { list: () => [{ path: '/repo', sessionIds: ['known'] }] } }, async () => null),
  ]) assert.deepEqual(await handler('branch', { sessionId: 'known' }, signal), empty);
});
test('registers a dedicated trusted-host channel through the already owner-scoped API', async () => {
  let registration;
  const dispose = async () => {};
  const ctx = {
    workspaceRegistry: { list: () => [] },
    connection: { rpc: { handle(...args) { registration = args; return dispose; } } },
    effect() { assert.fail('handle already owns lifecycle disposal'); },
  };
  assert.deepEqual(inject, ['connection', 'workspaceRegistry']);
  apply(ctx);
  assert.equal(registration[0], '/show-git-brunch');
  assert.deepEqual(registration[2], { authority: 'trusted-host' });
  assert.deepEqual(await registration[1]('branch', { sessionId: 'unknown' }, signal), empty);
});
