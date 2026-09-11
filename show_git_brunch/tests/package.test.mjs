import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

test('published exports and patch identify a loadable host/client pair', async () => {
  for (const entry of Object.values(manifest.exports)) await access(new URL(entry, root));
  const host = await import(new URL(manifest.exports['.'], root));
  assert.equal(typeof host.apply, 'function');
  const patch = await readFile(new URL(manifest.dsh.bundle.patch, root), 'utf8');
  assert.match(patch, /name: dsh-show-git-brunch/);
  assert.equal(manifest.dsh.client.platform, 'web');
});

test('shipped browser factory uses shared React and registers after mode', async () => {
  const source = await readFile(new URL(manifest.exports['./client'], root), 'utf8');
  let artifact;
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load(value) { artifact = value; } } } });
  assert.equal(artifact.id, manifest.name);
  const requires = [];
  const sharedReact = { createElement(){}, useEffect(){}, useState(){} };
  const plugin = artifact.factory(name => { requires.push(name); assert.equal(name, 'react'); return sharedReact; });
  assert.deepEqual(requires, ['react']);
  let registration;
  plugin.apply({connection: {rpc: {call() { throw new Error('must not query during registration'); }}}, slots: {
    inject(name, callback) { assert.equal(name, 'conversation.session.header.actions'); return callback(); },
    register(options, component) { registration = {options, component}; return () => {}; },
  }});
  assert.equal(registration.options.name, 'conversation.session.header.actions');
  assert.equal(registration.options.id, 'show-git-brunch');
  assert.ok(registration.options.order > -10 && registration.options.order < 0);
  assert.equal(typeof registration.component, 'function');
});
