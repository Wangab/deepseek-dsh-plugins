import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { bootstrap } from '../index.mjs';
if (!process.env.DSH_CHECKOUT) throw new Error('Set DSH_CHECKOUT to a built Harness checkout');
const host = pathToFileURL(resolve(process.env.DSH_CHECKOUT, 'packages/boot/app-boot/lib/index.js'));
const { boot, loadOverlayPatches } = await import(host.href);
// Loader disposal persists disabled entries: use a disposable fixture copy.
const temporary = await mkdtemp(fileURLToPath(new URL('./.integration-', import.meta.url)));
await cp(fileURLToPath(new URL('./fixtures/', import.meta.url)), temporary, {recursive: true});
const fixture = join(temporary, 'cordis.yml');
const patches = loadOverlayPatches('superpowers-test', fileURLToPath(new URL('../cordis.patch.yml', import.meta.url)));
assert.equal(patches[0].insert[0].name, 'dsh-superpowers');
let ctx;
try {
  ctx = await boot('superpowers-test', fixture, patches);
  const rows = await ctx.skills.list();
  assert.equal(rows.length, 14);
  const skill = await ctx.skills.get('superpowers-brainstorming');
  assert.ok(skill.content.startsWith('# DeepSeek Harness adaptation'));
  assert.ok(skill.resourceBase.path.endsWith('brainstorming' + (process.platform === 'win32' ? String.fromCharCode(92) : '/')));
  const assembly = await ctx.systemPrompt.assemble();
  assert.equal(assembly.contexts.find(item => item.name === 'superpowers-bootstrap').text, bootstrap);
  const removeOverride = ctx.skills.register({name: skill.name, description: 'Local override', source: 'runtime', content: 'Local instructions'});
  assert.equal((await ctx.skills.get(skill.name)).content, 'Local instructions');
  removeOverride();
  assert.equal((await ctx.skills.get(skill.name)).provider, 'superpowers');
  const entry = [...ctx.loader.entries()].find(item => item.options.id === 'skill-superpowers');
  assert.ok(entry?.fiber);
  await entry.fiber.dispose();
  assert.deepEqual(await ctx.skills.list(), []);
  assert.ok(!(await ctx.systemPrompt.assemble()).contexts.some(item => item.name === 'superpowers-bootstrap'));
  console.log('PASS: real Loader + bundle patch, 14 skills, lazy body/resources, bootstrap assembly, override precedence, disposal');
} finally {
  await ctx?.fiber.dispose();
  await rm(temporary, {recursive: true, force: true});
}
