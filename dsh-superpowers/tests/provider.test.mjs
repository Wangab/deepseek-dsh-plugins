import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createProvider, bootstrap, apply } from '../index.mjs';

test('catalog contains all 14 namespaced bundled skills', async () => {
  const provider = createProvider();
  const rows = await provider.list({});
  assert.equal(rows.length, 14);
  assert.equal(new Set(rows.map(row => row.name)).size, 14);
  for (const row of rows) {
    assert.match(row.name, /^superpowers-[a-z]+(?:-[a-z]+)*$/);
    assert.equal(row.rank, 600);
    assert.equal(row.provider, 'superpowers');
    assert.deepEqual(row.invocation, {modelInvocable: true, userInvocable: true});
    const definition = await provider.get(row, {});
    assert.equal(definition.name, row.name);
    assert.ok(definition.content.startsWith('# DeepSeek Harness adaptation'));
    assert.ok(!definition.content.slice(definition.content.indexOf('---')).includes('superpowers:'));
    assert.ok(!definition.content.slice(definition.content.indexOf('---') + 3).trimStart().startsWith('---'));
    await access(row.resourceBase.path + '/SKILL.md');
  }
});

test('load includes faithful upstream body after deterministic name mapping', async () => {
  const provider = createProvider();
  for (const row of await provider.list({})) {
    const raw = await readFile(row.path, 'utf8');
    const expected = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').replaceAll('superpowers:', 'superpowers-');
    assert.ok((await provider.get(row, {})).content.endsWith(expected));
  }
});

test('unknown candidates cannot be used to read arbitrary files', async () => {
  const provider = createProvider();
  assert.equal(await provider.get({name: 'superpowers-../../secret'}, {}), undefined);
});

test('lookup respects cancellation', async () => {
  const provider = createProvider();
  const rows = await provider.list({});
  const signal = AbortSignal.abort();
  await assert.rejects(provider.list({signal}), {name: 'AbortError'});
  await assert.rejects(provider.get(rows[0], {signal}), {name: 'AbortError'});
});

test('bootstrap points at loader and does not eagerly embed all skills', () => {
  assert.match(bootstrap, /superpowers-using-superpowers/);
  assert.match(bootstrap, /skill/);
  assert.ok(bootstrap.length < 2000);
});

test('plugin contributes through effect-owning registry APIs', () => {
  const calls = [];
  apply({skills: {registerProvider(factory) { calls.push(factory()); }}, systemPrompt: {context(section) {calls.push(section);}}});
  assert.equal(calls[0].name, 'superpowers');
  assert.equal(calls[1].name, 'superpowers-bootstrap');
  assert.equal(calls[1].text, bootstrap);
});
