// Print pinned upstream text assets for the installer; execute no upstream code.
const commit = 'b36e0829c6d0140e93cfef2ca599b1b07d4a7797';
async function get(url, json = false) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return json ? response.json() : response.text();
}
const tree = await get(`https://api.github.com/repos/obra/superpowers/git/trees/${commit}?recursive=1`, true);
if (tree.truncated) throw new Error('Upstream tree truncated');
const paths = tree.tree.filter(entry => entry.type === 'blob' && (entry.path.startsWith('skills/') || entry.path === 'LICENSE')).map(entry => entry.path);
const files = [];
for (const path of paths) files.push({ path, content: await get(`https://raw.githubusercontent.com/obra/superpowers/${commit}/${path}`) });
console.log(JSON.stringify({ commit, files: files.map(({path, content}) => ({path, chunks: Array.from({length: Math.ceil(content.length / 500)}, (_, i) => content.slice(i * 500, (i + 1) * 500))})) }, null, 2));
