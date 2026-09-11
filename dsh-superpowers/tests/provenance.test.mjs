import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('all 52 vendored assets match the verified provenance manifest offline', async () => {
  const manifest = JSON.parse(await readFile(new URL('../UPSTREAM.json', import.meta.url), 'utf8'));
  assert.equal(manifest.commit, 'b36e0829c6d0140e93cfef2ca599b1b07d4a7797');
  assert.equal(manifest.files.length, 52);
  for (const file of manifest.files) {
    const bytes = await readFile(new URL('../upstream/' + file.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  }
  assert.ok((await readFile(new URL('../LICENSE', import.meta.url), 'utf8')).includes('Copyright (c) 2025 Jesse Vincent'));
});
