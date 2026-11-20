# Next.js adapter handoff

Updated: 2026-11-20. This is a continuation guide, not a claim that Next.js export is supported.

## Objective and agreed direction

The user wants ordinary Next.js authoring with ForgeWP, eventually supporting both native WordPress theme deployment (no Next server required) and a decoupled Next frontend using the same WordPress content/editor model.

Start with the official Next app structure and prove the integration before exposing a Next.js choice in `create-forgewp`. The user approved proceeding incrementally. The next implementation step is the **Next.js route/markup contract**. Do not restart scaffolding or stop at a proposal.

Read first:

- [Design brief](nextjs-adapter-design-brief.md)
- [Research and compatibility ledger](nextjs-adapter-research.md)
- `../../.github/skills/forgewp-development/SKILL.md` (framework changes require corresponding sibling documentation and validation)
- `../../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` for related findings, not authorization to fix every backlog item.

## Workspace and preservation

- Framework: `C:\Users\hp\Desktop\ForgeWP`
- Documentation: `C:\Users\hp\Desktop\forgewp-docs`
- Shell: PowerShell. The work below is **local and uncommitted/unpushed**, including the earlier fixture and lockfile changes. Preserve it.
- Check `git status` in both repositories before editing. The docs repository has an unrelated user `.gitignore` change (`/scratch`); preserve it.
- Docs source updated: `content/18. API Reference/04-metadata-and-compiler-extensions.md`. Its build also updates tracked `lib/docs-data.ts`.
- Do not infer authorization to push from old conversation requests; the current request was to write this handoff.

## Completed work

### 1. Standard Next.js research fixture

`projects/nextjs-adapter-fixture/` was generated with official `create-next-app@16.1.7`: TypeScript, App Router, `src/`, no Tailwind. It uses Next 16.1.7 and React 19.2.4, workspace `@forgewp/react`, and `server-only`.

- `next.config.ts`: static export, trailing slashes, transpile `@forgewp/react`, webpack extension aliases for `.js` imports targeting TS source.
- Ordinary `/` and `/about/` routes with shared layout, CSS, metadata, aliased `next/link`, query/fragment navigation.
- `cms/mock-data.json` and `src/lib/content.ts`: server-only fixture data, not a public live WordPress transport.
- `src/blocks/IntroBlock.tsx`: existing `defineBlock`/`WpEditable` APIs.
- `src/components/IntroPreview.tsx`: renders saved markup for SSR/initial hydration, then mounts the local editor; demonstrates `useWpPageLink` fallback. Edits are transient local state.
- No `wp.config` pretending a Next adapter exists. No supported adapter selection was added.
- Scripts: `check-output.mjs`, `compare-renderers.mjs`, `check-browser.mjs`; see fixture README for usage and output locations.
- `packages/compiler/test/blocks/nextjs-fixture.test.js` verifies block compilation and the generated edit callback.
- `.github/workflows/nextjs-fixture.yml` adds Linux CI checks and artifact upload. It has not run on GitHub yet.
- `pnpm-lock.yaml` includes the fixture dependencies; keep this change.

The renderer comparison demonstrates that a separate React `renderToString` probe loses Next CSS, metadata, link normalization and RSC behavior. It is a research probe, **not** a production Next renderer.

### 2. Adapter-owned build dispatch

- `packages/compiler/lib/adapter-build.js`: loads the selected adapter, invokes/awaits `buildAssets` or `readBuildAssets` for `skipBuild`, forwards package-manager/verbosity settings, validates CSS/optional JS entry shape, reports missing hooks rather than silently falling back to Vite.
- `export-theme.js` uses this dispatch; markup still comes from the existing adapter `renderStaticMarkup` hook.
- React and HTML adapters explicitly re-export the existing Vite build/manifest reader.
- Public TypeScript interface includes optional hooks so render-only/testing adapters remain representable; export requires the appropriate hook.
- Tests: `test/functions/adapter-build.test.js`, `adapter-build-vite.test.js`, and updated adapter runtime/type checks.

### 3. Adapter-owned packaging and client mappings

- New `packages/compiler/lib/vite-export-assets.js` exports `packageAssets(themeRoot, outDir, { islands? })`; React and HTML share it.
- It owns copying Vite `dist` output, public asset URL rewriting, both manifest locations (`dist/.vite/manifest.json` and `dist/manifest.json`), island chunk resolution, and existing static-theme JS pruning.
- It returns `ForgeWPPackagedAssets`:
  - `assetFiles`: source asset path -> theme-relative output path.
  - `clientEntries`: island identifier -> theme-relative client module path.
  - `runtimeEntry`: optional theme-relative React runtime module path.
- `generate-theme.js` awaits `adapter.packageAssets`, resolves asset placeholders and hydration mappings from that result, and no longer reads/copies Vite output itself. It still generates the existing React hydration runtime.
- Hydration JavaScript now uses theme-relative module paths instead of forcing `assets/`.
- `lib/functions/index.js` and `lib/functions/hydration-enqueuer.js` use theme-relative runtime/CSS paths, including editor CSS. Existing Vite paths continue to resolve identically.
- Tests: `test/functions/adapter-packaging.test.js` and `adapter-packaging-integration.test.js`.
- The integration test supplies a mocked adapter with no `dist` folder or Vite manifest, packages a `client/` module, parses/executes generated hydration JS with browser stubs, and checks PHP runtime/CSS enqueue paths. This proves the boundary, not Next runtime compatibility or a live browser acceptance test.

## Validation completed

Latest implementation:

- All 45 `test/functions` files passed: **444 tests**.
- After the final editor CSS path adjustment, focused integration/hydration checks passed: **27 tests**.
- Earlier packaging/hydration/public API selection passed: **35 tests**.
- Adapter runtime check and `tsconfig.test.json` typecheck passed.
- React and HTML starter production builds succeeded. Their export fixture passed again after the final PHP path changes, reusing those built assets.
- React export had no missing files/warnings. HTML export has existing optional empty header/footer warnings; no missing required files.
- Documentation typecheck and production build passed (282 generated pages).
- `git diff --check` passed in both repos; CRLF notices are informational.

Earlier fixture evidence:

- Next webpack production build, typecheck, static-output check, renderer comparison and local dev routes passed.
- 20 focused block/local-preview/link tests passed.
- Chrome exercised local editing, navigation, fallback link and reload without recorded hydration/runtime errors. **The strict browser test remains red on Windows**: runtime requests `/about/__next.about.__PAGE__.txt`, but the build emits `/about/__next.about/__PAGE__.txt`. See upstream issue linked in the research note. Do not hide this with a server rewrite or call the browser check green.
- No live WordPress installation, Gutenberg save/reload acceptance, decoupled transport, or deployment-mode round trip has been verified.

## Next implementation slice

1. Inspect the design brief, research renderer comparison, `render-static.js`, React/HTML `renderStaticMarkup`, `export-theme.js`, and route/template handling in `generate-theme.js`.
2. Design an additive adapter-owned route/markup result for fixed Next App Router pages. It must preserve route identity, shared layout/head information and asset/client ownership while keeping the current React/HTML markup API compatible.
3. Prove `/` and `/about/` extraction with the existing fixture. Explicitly account for Next CSS/metadata/RSC payload differences; do not treat raw Next client assets or `renderToString` as an already-working native WordPress runtime.
4. Add focused tests plus existing export regression checks. Keep supported adapter names unchanged until the native pipeline is actually usable.
5. Next after that: import-binding-aware `next/link` transformation (including aliases), fixed-route WordPress permalink mapping (including subdirectory installs), preserved block/editable identities, and a disposable live WordPress acceptance test.

Linux fixture CI/version validation also remains pending. Do not promise full Next feature parity. Server Actions, middleware, route handlers, dynamic routes, ISR, auth/forms/SEO/WooCommerce parity, and client boundaries require explicit investigation/diagnostics.

The current contracts are separate build, render and package hooks, **not yet a unified route/build-output model**. Build entry assets still use the existing CSS/JS shape. Framework preflight, island splitting and block scaffolding also retain existing assumptions and need review before enabling Next export.

## Commands and environment notes

`pnpm` is not directly available here, and Corepack previously pointed to a missing pnpm version. Use:

```powershell
npm.cmd exec --yes --package=pnpm@10 -- pnpm install --frozen-lockfile
```

From `packages/compiler`:

```powershell
node test/adapter-loader.js
node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json
node node_modules/vitest/vitest.mjs run --configLoader runner test/functions
node node_modules/vitest/vitest.mjs run --configLoader runner test/hydration
npm.cmd exec --yes --package=pnpm@10 -- pnpm run test:export-fixture
```

To reuse already-current starter builds only:

```powershell
$env:RUN_BUILD='false'
node test/export-fixture/run-export-fixture.js
Remove-Item Env:RUN_BUILD
```

From the docs repository: `npm.cmd run typecheck` and `npm.cmd run build`.

- Vitest includes `test/functions`, `test/blocks`, `test/hydration`, and `test/assets`; tests placed directly under `test/` are not discovered automatically.
- Some dependency resolution errors were sandbox access issues. A missing `tsx/cli` was resolved by a frozen-lockfile install. Diagnose installation/access before changing source to work around missing dependencies.
- Escalated test/build execution was used where installed dependencies or child processes required it. Git metadata writes/network may also require escalation.
- For sandbox Git ownership errors in the docs repo, use a per-command `git -c safe.directory=C:/Users/hp/Desktop/forgewp-docs ...` rather than changing global settings.
- Use UTF-8 explicitly for Python file reads/writes on Windows; default cp1252 fails on these source files.
- Browser-tool capability was unavailable in the earlier session; the fixture browser check uses the existing repo Chrome runner. Recheck tool availability if needed.

## Known findings outside this slice

Already recorded in the improvement brief: non-Vite TS extension resolution, `WpEditable` SSR/client preview boundary, shorthand object-property rewriting in generated edit callbacks (fixture uses `{ heading: value }`), and `WpIcon` webpack dynamic-dependency warnings. Avoid expanding this task into unrelated fixes.

No processes were intentionally left running. Before publishing, review all accumulated fixture/framework/docs changes and obtain any approval required by the current session. The user can resume by asking the next agent to read this file and continue the route/markup slice.
