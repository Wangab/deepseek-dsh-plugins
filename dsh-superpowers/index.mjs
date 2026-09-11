/** Unofficial Superpowers provider; no network, hooks, or script execution. */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
const adapter = readFileSync(new URL('./adapter.md', import.meta.url), 'utf8');
const prefix = 'superpowers-';
const seen = new Set();
for (const entry of catalog) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || typeof entry.description !== 'string' || !entry.description.trim() || seen.has(entry.name)) {
    throw new Error('Invalid or duplicate bundled skill metadata');
  }
  seen.add(entry.name);
}

/** Small durable reminder; full skill bodies remain lazy-loaded. */
export const bootstrap = 'Superpowers for DeepSeek Harness is enabled. Before responding or taking task actions, load superpowers-using-superpowers through the skill tool if its instructions are not already in context, then load applicable skills by their exact catalog names. In Code Mode call tools.skill inside run_code. A subagent assigned a specific task follows its provided task instructions rather than restarting brainstorming. If tools are unavailable, disclose that limitation; do not invent tools. DSH system/developer instructions, permissions, and explicit human choices take precedence over skills. The DSH adaptation included in each skill also applies to its supporting resources.';

/** Create an immutable, bundled-rank provider. @returns {object} DSH SkillProvider. */
export function createProvider() {
  const candidates = catalog.map(entry => {
    const base = new URL('./upstream/skills/' + entry.name + '/', import.meta.url);
    return Object.freeze({
      name: prefix + entry.name, description: entry.description,
      invocation: Object.freeze({modelInvocable: true, userInvocable: true}),
      source: 'bundled', provider: 'superpowers', rank: 600,
      resourceBase: Object.freeze({kind: 'directory', path: fileURLToPath(base)}),
      locator: entry.name, path: fileURLToPath(new URL('SKILL.md', base)),
    });
  });
  const byName = new Map(candidates.map(row => [row.name, row]));
  return {
    name: 'superpowers',
    async list(options = {}) {
      options.signal?.throwIfAborted();
      return [...candidates];
    },
    async get(candidate, options = {}) {
      options.signal?.throwIfAborted();
      const row = byName.get(candidate.name);
      if (!row) return undefined;
      const raw = await readFile(row.path, {encoding: 'utf8', signal: options.signal});
      const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
      if (!frontmatter.test(raw)) throw new Error('Missing frontmatter in ' + row.path);
      const body = raw.replace(frontmatter, '').replaceAll('superpowers:', prefix);
      const {rank, locator, ...definition} = row;
      return {...definition, content: adapter + '\n---\n\n' + body};
    },
  };
}

/** Cordis function-plugin identity and injected services. */
export const name = 'skill-superpowers';
export const inject = ['skills', 'systemPrompt'];

/** Register reversible contributions via the effect-owning host APIs.
 * @param {object} ctx Cordis context providing skills and systemPrompt.
 */
export function apply(ctx) {
  ctx.skills.registerProvider(() => createProvider());
  ctx.systemPrompt.context({name: 'superpowers-bootstrap', order: 90, text: bootstrap});
}
