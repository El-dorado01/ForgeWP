# ForgeWP Adapter Guide

ForgeWP uses a framework adapter boundary to separate the compiler core from framework-specific rendering and hydration behavior.

## Adapter responsibilities

A framework adapter must provide the following exports:

- `renderStaticMarkup(themeRoot)`
  - Server renders the theme app and returns static HTML output.
- `scanForHydrationIslands(themeRoot)`
  - Returns an array of kebab-case hydration island identifiers discovered in theme source code.
- `findComponentPath(themeRoot, kebabName)`
  - Resolves a source file path for a hydration island component.
- `getHydrationRollupInputs(themeRoot)`
  - Returns a Rollup/Vite input mapping for the theme build.

Optional helpers may include:

- `generateHydrationRuntime(themeRoot, assetsOut, distAssets, hydrationIslands)`
  - Builds runtime loader scripts and configuration for client-side hydration.

## Current adapters

- `react` — the default adapter used by ForgeWP today.
- `html` — a concrete static HTML proof-of-concept adapter.
- `stub` — a minimal example adapter stub for onboarding new framework support.

## Adding a new adapter

1. Add a new adapter module under `packages/compiler/lib/adapters/`.
2. Export the required adapter methods.
3. Update `packages/compiler/lib/framework-adapter.js` to resolve the new adapter name.
4. If applicable, update any Vite templates to import and use `loadFrameworkAdapter()`.
5. Add tests for the new adapter behavior.

## Running adapter tests

- Runtime contract validation: `pnpm --filter @forgewp/compiler run test:adapter-runtime`
- Type contract validation: `pnpm --filter @forgewp/compiler run test:adapter-types`

## Vite config template usage

The starter and create-forgewp templates now load the selected framework adapter at build time and use its hydration input helper. They also resolve the selected adapter from `wp.config.ts`.

```ts
import { loadConfig, loadFrameworkAdapter } from '@forgewp/compiler';

export default defineConfig(async () => {
  const config = await loadConfig(__dirname);
  const adapter = await loadFrameworkAdapter(
    config.frameworkAdapter || 'react',
  );
  const getHydrationRollupInputs = adapter.getHydrationRollupInputs;

  return {
    build: {
      rollupOptions: {
        input: getHydrationRollupInputs(__dirname),
      },
    },
  };
});
```
