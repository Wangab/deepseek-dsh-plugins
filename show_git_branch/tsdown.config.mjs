/**
 * Standalone client-bundle config, replicating the artifact contract of the
 * in-repo shared preset (packages/client/tsdown.client.ts): a CJS bundle at
 * lib/client.js that registers its factory through
 * window.__ModuleLoader__.load and resolves the shell-seeded baseline modules
 * through the injected require. Everything else bundles privately.
 */
/** Plugin id == package name, stamped into the module-loader handoff. */
const ID = 'show-git-branch'

/** The shell-seeded module table (packages/client/web/src/platform.ts). */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

/** Whether one import specifier names a shell-seeded module. */
const isPlatformModule = (specifier) => PLATFORM_MODULES.includes(specifier)

export default {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: isPlatformModule,
    alwaysBundle: (specifier) => !isPlatformModule(specifier),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    sourcemapExcludeSources: false,
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}
