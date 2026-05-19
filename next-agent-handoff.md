# ForgeWP Handoff for Next Agent

## What was implemented

- Added a small export integration test harness under `packages/compiler/test/export-fixture`.
- Created `run-export-fixture.js` to:
  - optionally run `pnpm --filter @forgewp/starter run build`
  - call `exportTheme({ themeRoot, skipBuild: true, zip: false, packageManager: 'pnpm' })`
  - verify generated output files and assets
  - print a JSON summary and return an exit code.
- Added `packages/compiler/package.json` script:
  - `test:export-fixture`
- Added README for the fixture in `packages/compiler/test/export-fixture/README.md`.

## How to run

From the repository root:

```bash
pnpm -w install
pnpm --filter @forgewp/compiler test:export-fixture
```

To skip the starter build step:

```bash
RUN_BUILD=false pnpm --filter @forgewp/compiler test:export-fixture
```

## Current status

- The test harness is scaffolded and functional.
- Running the script with `RUN_BUILD=false` currently exits successfully with warnings.
- Output file validation is currently tolerant of empty `header.html` and `footer.html` files.

## Known observations and issues

- The starter build previously reported an issue in `src/.forgewp/SEO.tsx`:
  - `default` is not exported by `react-helmet-async`
- The export harness currently treats empty `header.html` and `footer.html` as warnings instead of failures.
- The test script uses ESM-friendly `fileURLToPath(import.meta.url)` and works in the compiler package.

## Next agent tasks

1. Validate and harden the export integration test:
   - assert non-empty static fragments for `header.html` and `footer.html` if those should always be generated.
   - add checks for `single.html`, `404.html`, `archive.html`, and `theme.json` if applicable.
   - verify hydration mapping output and manifest handling when hydration islands exist.
2. Add CI automation:
   - create a GitHub Actions workflow that runs `pnpm -w install`, builds the starter, then runs `pnpm --filter @forgewp/compiler test:export-fixture`.
3. Investigate and fix the starter build warning/error around `react-helmet-async`.
4. Optionally extend the fixture test to validate the generated `.forgewp/out/<slug>` theme package structure comprehensively.

## Files to inspect

- `packages/compiler/test/export-fixture/run-export-fixture.js`
- `packages/compiler/test/export-fixture/README.md`
- `packages/compiler/package.json`
- `packages/compiler/lib/export-theme.js`
- `packages/compiler/lib/generate-theme.js`
- `packages/starter/vite.config.ts`
- `packages/starter/src/.forgewp/SEO.tsx`
