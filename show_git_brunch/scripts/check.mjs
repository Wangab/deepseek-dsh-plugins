import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { renderClientBundle } from './build.mjs';

const root = new URL('../', import.meta.url);
for (const file of ['index.mjs','src/git.mjs','src/server.mjs','src/polling.mjs','src/client.mjs','lib/client.js','cordis.patch.yml']) await access(new URL(file, root));
const actual = await readFile(new URL('lib/client.js', root), 'utf8');
assert.equal(actual, await renderClientBundle(), 'lib/client.js is stale; run npm run build');
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(manifest.name, 'dsh-show-git-brunch');
assert.equal(manifest.exports['./client'], './lib/client.js');
assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
console.log('package and generated client are consistent');
