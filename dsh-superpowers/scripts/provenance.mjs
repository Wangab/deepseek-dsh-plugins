// Compare vendored file bytes with GitHub's pinned Git blob ids; no upstream code runs.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const commit = 'b36e0829c6d0140e93cfef2ca599b1b07d4a7797';
const response = await fetch('https://api.github.com/repos/obra/superpowers/git/trees/' + commit + '?recursive=1');
if (!response.ok) throw new Error('GitHub HTTP ' + response.status);
const tree = await response.json();
if (tree.truncated) throw new Error('Truncated upstream tree');
const files = [];
for (const entry of tree.tree.filter(e => e.type === 'blob' && (e.path.startsWith('skills/') || e.path === 'LICENSE'))) {
  const bytes = await readFile(new URL('../upstream/' + entry.path, import.meta.url));
  const blob = createHash('sha1').update('blob ' + bytes.length + String.fromCharCode(0)).update(bytes).digest('hex');
  if (blob !== entry.sha) throw new Error('Upstream bytes differ: ' + entry.path);
  files.push({path: entry.path, gitBlob: blob, sha256: createHash('sha256').update(bytes).digest('hex')});
}
console.log(JSON.stringify({repository: 'https://github.com/obra/superpowers', commit, license: 'MIT', copyright: 'Copyright (c) 2025 Jesse Vincent', modifications: 'upstream/ bytes unchanged; runtime removes frontmatter, maps superpowers: to superpowers-, and prepends adapter.md', files}, null, 2));
