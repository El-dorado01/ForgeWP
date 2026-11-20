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

### 4. Adapter-owned route/markup contract and Next.js fixed-route extraction

- `packages/compiler/lib/index.d.ts`: added additive `ForgeWPStaticRoute`, `ForgeWPStaticRouteAssets`, and `ForgeWPStaticLayout` types on `ForgeWPStaticMarkup` (plus optional `routes` on `ForgeWPValidationOptions`). Legacy React/HTML markup objects remain unchanged. Supported adapter names remain `['react', 'html', 'stub']`.
- `packages/compiler/lib/render-static.js`: added `normalizeStaticRoutePath`, `resolveStaticPageRoute`, and `validateStaticMarkup` (rejecting malformed markup, duplicate route paths, colliding `templateSlug`s, dynamic bracket segments, and malformed asset inventories).
- `packages/compiler/lib/export-theme.js`, `generate-theme.js`, and `validate-export.js`: forward and consume adapter-provided `routes` and `layout` to auto-create WordPress pages in `functions.php`, scan i18n keys, generate `page-<templateSlug>.php`, `forgewp-static/template-<templateSlug>.html`, and `forgewp-static/template-<templateSlug>-head.html` without requiring `.forgewp/template-*.html` on disk, and respect `layoutExtracted` / `ownsShell` so `<main id="details">` is preserved. `validate-export.js` now resolves `scanForHydrationIslands` via `loadFrameworkAdapter` instead of assuming Vite's `dist/.vite/manifest.json`.
- `packages/compiler/lib/next-route-extractor.js`: extracts fixed routes (`/` and `/about/`, nested routes, `404`) from Next's documented static export (`out/`), supporting both `trailingSlash: true` and `trailingSlash: false`, splitting identical shared leading `<header>` and trailing `<footer>` across primary routes, preserving per-route `<head>` metadata (`<title>`, favicon, `<meta>`, JSON-LD), verifying local CSS files in `assets.stylesheets`, and stripping/accounting for Next client chunks and `self.__next_f` RSC Flight payloads separately without treating them as a native WordPress runtime.
- `.github/workflows/nextjs-fixture.yml`: runs the route/markup contract and fixture integration tests with `FORGEWP_REQUIRE_NEXT_FIXTURE=1` after building the fixture.
- Tests: `test/functions/render-static.test.js` (11 tests), `test/functions/next-route-extractor.test.js` (4 tests, including real `projects/nextjs-adapter-fixture` extraction), `test/functions/adapter-routes-integration.test.js` (2 tests, synthetic nested route + real fixture `generateTheme`/`validateExport` integration), and updated `test/adapter-contract.ts`.

### 5. Import-binding-aware `next/link` transformation and fixed-route WordPress permalink mapping

- `packages/compiler/lib/next-link-transform.js`: Babel scope-based `analyzeNextLinks`, `transformNextLinksInSource`, `scanProjectNextLinks`, and `applyVerifiedNextLinksToMarkup` resolve `next/link` by module/symbol identity (default, aliases like `NextLink`, named default, namespace `NS.default`) while leaving shadowed local `Link`, custom `./Link`, plain `<a>`, and `@forgewp/react` `Link`/`WpLink` untouched; also traces `@forgewp/react` `useWpPageLink(slug, fallback)` calls.
- Supports static strings, static templates, and static `{ pathname, query, hash }` objects, strips Next-only props (`prefetch`, `scroll`, `shallow`, `replace`, `passHref`, `legacyBehavior`, `as`), warns on `locale` and unknown internal routes (`NEXT_LINK_UNKNOWN_ROUTE`), errors clearly on dynamic `href` expressions (`NEXT_LINK_DYNAMIC_HREF`), and preserves external URLs, `mailto:`/`tel:`, `#hash`, and `?query` verbatim.
- `packages/compiler/lib/functions/index.js` & `markup-processor.js`: added additive `__FORGEWP_ROUTELINK:...__` token expansion compiling to `forgewp_resolve_route_url($route_slug, $fallback_path, $query, $fragment)` in `functions.php` — resolving live WordPress permalinks via `forgewp_resolve_route_page_id()`, handling Pretty and Plain (`?page_id=N`) permalinks without double `?`, Polylang localized home URLs, and subdirectory-safe `home_url(...)` fallbacks.
- `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`: recorded two verified shared-framework findings observed during this work (subdirectory-safe fallbacks in legacy `forgewp_resolve_page_link`/`__FORGEWP_PAGELINK_*__`, and clarifying/reconciling `routing.js` auto-created template Pages vs. `cms/mock-data` `page` records).
- Tests: `test/functions/next-link-transform.test.js` (6 tests, including real `projects/nextjs-adapter-fixture` scan/rewrite/`generateTheme` integration, `php -l` linting, and PHP 8.2 execution covering root, subdirectory, renamed-slug, Plain permalink, deleted-page fallback, unknown internal route, and Polylang home resolution); added to `.github/workflows/nextjs-fixture.yml`.

## Validation completed

Latest implementation (Linux VM, Node v24.22.3, PHP 8.2.35, pnpm 10.34.9):

- All 78 Vitest compiler test files (`test/functions`, `test/hydration`, `test/blocks`, `test/assets`) passed: **665 tests** (with `FORGEWP_REQUIRE_NEXT_FIXTURE=1`, including PHP 8.2 execution and `php -l` linting).
- Adapter runtime contract check (`test/adapter-loader.js`), `tsconfig.test.json` typecheck, and `public-api-types.test.js` passed.
- React and HTML starter production builds and full export fixture (`pnpm --filter @forgewp/compiler run test:export-fixture`) passed (React: 0 missing/warnings; HTML: 0 missing, existing optional empty header/footer warnings).
- Next.js fixture Linux build (`next build --webpack`), `check:next-output`, and `check:renderers` passed; Linux build emits `out/about/__next.about.__PAGE__.txt` cleanly. (Headless Chrome `check:browser` timed out at browser startup inside the container sandbox; verify in GitHub Actions Linux CI.)
- Sibling `forgewp-docs` repo was not accessible (`403` on clone) from this session; sync the additive `ForgeWPStaticMarkup.routes`/`layout` note to `forgewp-docs/content/18. API Reference/04-metadata-and-compiler-extensions.md` once access is enabled.
- `git diff --check` passed.

Earlier fixture evidence:

- Chrome on Windows exercised local editing, navigation, fallback link and reload without recorded hydration/runtime errors, while strict `check:browser` remained red on Windows due to upstream [Next.js #85374](https://github.com/vercel/next.js/issues/85374).
- No live WordPress installation, Gutenberg save/reload acceptance, decoupled transport, or deployment-mode round trip has been verified.

## Next implementation slice

1. Preserve declared Gutenberg block and `WpEditable` identities through the native Next pipeline (compiling and packaging `src/blocks/IntroBlock.tsx` alongside fixed-route output, and ensuring saved WordPress block edits appear on the frontend without rebuilding).
2. Wire an internal/experimental Next export harness (reviewing `validateCriticalFiles`, island splitting, and block scaffolding assumptions) and verify the exported ZIP on a disposable live WordPress installation (install, activate, edit inline in Gutenberg, save/reload, confirm frontend update with no Next server).
3. Address the open fixture DX gaps recorded in `nextjs-adapter-research.md` (`cms/mock-data.ts` with `defineWpPosts`, authored `/about` without forced trailing slashes, and live WordPress data bindings for decoupled + native round-trip verification) before exposing a supported Next adapter name.

Linux fixture CI/version validation also remains pending. Do not promise full Next feature parity. Server Actions, middleware, route handlers, dynamic routes, ISR, auth/forms/SEO/WooCommerce parity, and client boundaries require explicit investigation/diagnostics.

The current contracts cover adapter-owned build, render (with additive fixed-route records), and asset packaging hooks. Build entry assets still use the existing CSS/JS shape. Framework preflight, island splitting and block scaffolding still retain React/Vite assumptions and need review before enabling Next export.

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
