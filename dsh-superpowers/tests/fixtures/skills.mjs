import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
if (!process.env.DSH_CHECKOUT) throw new Error('Set DSH_CHECKOUT to a built Harness checkout');
export default (await import(pathToFileURL(resolve(process.env.DSH_CHECKOUT, 'packages/skill/skill/lib/index.js')).href)).default;
