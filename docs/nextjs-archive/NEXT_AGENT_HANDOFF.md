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

### 6. Native Gutenberg blocks, `WpEditable`, `BlockArea` SSR, and experimental ZIP export

- `packages/compiler/lib/blocks/index.js` & `generate-theme.js`: `compileBlocks` now accepts theme-relative `cssFile` (`assets?.cssFile`) via `resolveBlockEditorStyle` instead of assuming Vite's `assets/index-*.css`, so compiled `blocks/<slug>/block.json` `editorStyle` resolves to the real packaged Next CSS (preserving React/Vite output byte-for-byte). `generateTheme` and `validateExport` also accept an optional `adapter` override without adding public adapter names yet.
- `packages/react/src/components/BlockArea.tsx`: checks `globalThis._forgeWpCompileTime` and `(globalThis as any).process?.env?.FORGEWP_NATIVE_EXPORT === '1'` in Node/SSR so `<BlockArea />` compiles to `<forgewp-block-area>` -> `<?php the_content(); ?>` during Next native export while keeping local dev preview and browser-only `@forgewp/react` typechecking clean.
- `packages/compiler/lib/next-export-experimental.js`: internal experimental native export harness (`packageNextAssets`, `readCompiledBlockIdentities`, `exportNextExperimentalTheme`) wiring route extraction, verified `next/link` & `useWpPageLink` permalink rewriting, CSS-only asset packaging (single or bundled, skipping Next JS runtime chunks), Gutenberg block compilation (`src/blocks/IntroBlock.tsx` -> `forgewp/next-intro`), `generateTheme`, `validateExport`, and ZIP packaging.
- `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`: recorded `validateCriticalFiles()` preflight adapter-hook finding (recorded only; existing React preflight unchanged).
- Tests: `test/functions/next-export-blocks.test.js` (3 tests: `BlockArea` SSR native export -> `the_content()`, multi-CSS bundling with matching `block.json` `editorStyle`, and full `projects/nextjs-adapter-fixture` ZIP export verifying `assets/forgewp-editor.js` RichText inline editing in Node VM with localized `forgeWpBlocks` from `functions.php`, live `blocks/next-intro/render.php` execution in PHP 8.2 without rebuilding, and `php -l` across every generated PHP/template file); added to `.github/workflows/nextjs-fixture.yml`.

### 7. Live disposable WordPress acceptance, decoupled server-side transport, and native <-> decoupled round trip

- `packages/compiler/lib/functions/index.js`: added read-only decoupled REST bridge (`forgewp_serialize_rest_blocks`, `forgewp_register_decoupled_rest_bridge`) registering `forgewp_route_id` on `page`, `forgewp_blocks` on REST-enabled post types (strictly gating drafts and password-protected posts behind `current_user_can('read_post', $post_id)`), and `GET /wp-json/forgewp/v1/routes` (returning only published non-password-protected routes with subdirectory-stripped paths).
- `packages/compiler/lib/functions/routing.js`: fixed a live-WordPress-discovered bug in `forgewp_auto_create_pages_and_menus()` where renaming a provisioned page slug in wp-admin caused the `init` hook to recreate a duplicate stub page at the old slug; lookup now matches existing pages by durable `forgewp_route_id` before falling back to `get_page_by_path()`.
- `packages/compiler/lib/next-decoupled-transport.js`: experimental server-side WordPress content client (`createWordPressContentClient`), serialized Gutenberg block parser (`parseSerializedBlocks`), shared `defineBlock` render matcher (`resolveBlockRenderNodes`), subdirectory basePath normalizer (`normalizeWpBaseUrl`, `stripWpBasePath`), and read-only deployment-switch preflight & rollback validator (`verifyDeploymentSwitch`). Operates in zero-WordPress fixture mode when `wpUrl` is omitted, blocks server credentials in browser runtimes (`FORGEWP_CLIENT_BUNDLE_CREDENTIAL_GUARD`), and rejects unauthenticated draft previews (`FORGEWP_PREVIEW_AUTH_REQUIRED`).
- `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`: recorded verified `front-page.php` (`buildIndexPhp`) loop-context finding for `<BlockArea />` on static front pages.
- Sibling `El-dorado01/forgewp-docs`: synced additive `ForgeWPStaticMarkup.routes`/`layout`, `ForgeWPPackagedAssets`, and `ForgeWPValidationOptions.routes` notes in `content/18. API Reference/04-metadata-and-compiler-extensions.md` and rebuilt `lib/docs-data.ts` (PR #1, merged).
- Tests: `test/functions/next-decoupled-transport.test.js` (7 unit/contract/PHP 8 tests) and `test/functions/next-live-wp-acceptance.test.js` (`FORGEWP_LIVE_WP_ACCEPTANCE=1`, wired into `.github/workflows/nextjs-fixture.yml`).

### 8. Adapter-aware preflight, internal `next-adapter.js`, native diagnostics, fixture DX cleanup, and live decoupled Next.js SSR verification

- `packages/compiler/lib/validate.js`, `export-theme.js`, `adapter-build.js`, `render-static.js`, `react-adapter.js`, `adapters/html-adapter.js`, `bin/doctor.js`, and `index.d.ts`: routed `validateCriticalFiles()` preflight through `adapter.getCriticalFiles(themeRoot)` and loaded config/adapter before preflight in `exportTheme()`. React/HTML preflight checks remain unchanged, while custom/Next adapters validate only their declared entry files and opt out of Vite blueprint restoration and `src/blocks/generated/` pre-scaffolding. Marked the `validateCriticalFiles()` item completed in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`.
- `packages/compiler/lib/next-adapter.js`: internal `ForgeWPFrameworkAdapter` implementation (`getCriticalFiles`, `buildAssets`, `readBuildAssets`, `renderStaticMarkup`, `packageAssets`, `scanForHydrationIslands`, `findComponentPath`, `getHydrationRollupInputs`) plus `diagnoseNextNativeCompatibility()` detecting unsupported native features (`NEXT_NATIVE_DYNAMIC_ROUTE`, `NEXT_NATIVE_ROUTE_HANDLER`, `NEXT_NATIVE_MIDDLEWARE`, `NEXT_NATIVE_SERVER_ACTION`, `NEXT_NATIVE_DYNAMIC_RUNTIME_API`, and warning `NEXT_NATIVE_ISR_REVALIDATE`). `SUPPORTED_ADAPTERS` remains `['react', 'html', 'stub']` until Slice 10.
- `projects/nextjs-adapter-fixture/`: dropped forced `trailingSlash: true` in `next.config.ts` (supporting ordinary `/about` links and boundary-selected `FORGEWP_DEPLOYMENT_MODE=decoupled`), replaced `cms/mock-data.json` with typed `cms/mock-data.ts` (`defineWpPosts` from `@forgewp/react/config`), and wired `src/lib/content.ts` to read typed local fixtures when `FORGEWP_WP_URL` is unset or live WordPress REST + `forgewp_route_id` + `forgewp_blocks` when `FORGEWP_WP_URL` is configured. Updated `scripts/check-output.mjs`, `check-browser.mjs`, and `compare-renderers.mjs`.
- Tests: `test/functions/next-adapter.test.js` (3 tests: adapter-aware preflight, native compatibility diagnostics, and real `exportTheme({ adapter: nextAdapter })` end-to-end export on `projects/nextjs-adapter-fixture` without mutating app source) and upgraded `test/functions/next-live-wp-acceptance.test.js` to export through real `exportTheme(nextAdapter)` AND boot a real decoupled Next.js App Router HTTP server (`next dev --webpack` with `FORGEWP_DEPLOYMENT_MODE=decoupled FORGEWP_WP_URL=...`) verifying live WordPress Edit #1, wp-admin renamed `/about` -> `/our-story`, and immediate Edit #2 SSR reflection with zero Next.js restart; added to `.github/workflows/nextjs-fixture.yml`.

### 9. Static front-page loop fix, `@forgewp/react/server` live bindings, Next.js hydration islands, and shared-framework polish

- `packages/compiler/lib/php-builders.js`: updated `buildIndexPhp()` and `shellOwnedFrontPagePhp()` to initialize `the_post()` when `is_front_page() && is_page() && have_posts()`, so `<BlockArea />` (`the_content()`) and `get_the_title()` work natively on static front pages without switching to `template-forgewp-builder.php` and without looping on posts-index front pages.
- `packages/react/src/server.ts` (`@forgewp/react/server` subpath export): added server-safe `createWpServerClient()` and `isNativeWordPressExport()` bridging local `cms/mock-data.ts` fixtures (dev), live WordPress REST + `forgewp_route_id` + `forgewp_blocks` (decoupled), and native ForgeWP compile tokens (`__FORGEWP_THE_TITLE__`, `__FORGEWP_THE_CONTENT__`, `__FORGEWP_META_*__`, `__FORGEWP_OPTION_*__`) during `FORGEWP_NATIVE_EXPORT=1`. Wired `projects/nextjs-adapter-fixture/src/lib/content.ts` to `@forgewp/react/server`.
- `packages/compiler/lib/next-islands.js`, `next-adapter.js`, and `validate-export.js`: implemented explicit `<Hydrate>` `'use client'` island discovery (`scanNextHydrationIslands`), component resolution (`findNextIslandComponentPath`), and standalone `esbuild` ESM island + shared React runtime bundling (`bundleNextIslands`, rejecting `server-only`/`next/headers` imports and never copying `_next/static/chunks/*`). Updated `validate-export.js` to validate adapter-packaged island chunks without requiring Vite's `dist/.vite/manifest.json`.
- `packages/react/src/components/WpIcon.tsx` & `WpEditable.tsx`: added bundler-safe `registerIconProvider()` + `/* webpackIgnore: true */` (eliminating webpack dynamic-dependency warnings in `projects/nextjs-adapter-fixture`), and made `WpEditable` SSR/hydration safe with explicit `WpEditablePreviewProvider` opt-in. Marked all three items completed in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`.
- Tests: `test/functions/next-slice9.test.js` (4 tests covering PHP 8 front-page static vs. posts-index loop, `@forgewp/react/server` across all 3 modes + `php -l`, full `exportTheme(nextAdapter)` esbuild island bundling + ESM import + server-import rejection, and `WpEditable`/`WpIcon` contracts); added to `.github/workflows/nextjs-fixture.yml`.

### 10. Public opt-in `nextjs` adapter, `withForgeWP()`, `create-forgewp --adapter nextjs`, and public docs

- `packages/compiler/lib/framework-adapter.js`, `index.d.ts`, `types.js`, `templates/forgewp-config.ts`, `ADAPTERS.md`, `test/adapter-loader.js`: publicly registered `'nextjs'` in `SUPPORTED_ADAPTERS` (`['react', 'html', 'nextjs', 'stub']`) resolving to `./next-adapter.js`.
- `packages/react/src/next.ts` (`@forgewp/react/next`, re-exported from `@forgewp/react/config`): added `withForgeWP()` Next.js config wrapper encapsulating boundary-selected `output: 'export'` (`FORGEWP_DEPLOYMENT_MODE=decoupled` toggle), `transpilePackages: ['@forgewp/react']`, and webpack `resolve.extensionAlias` (`.js` -> `['.ts', '.tsx', '.js']`). Switched `projects/nextjs-adapter-fixture/next.config.ts` to use `withForgeWP()` directly and marked the non-Vite source-package resolution item completed in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`.
- `packages/create-forgewp/`: added `template-nextjs/` (official Next.js App Router + TypeScript + `withForgeWP()` + `wp.config.ts` with `frameworkAdapter: 'nextjs'` + `cms/mock-data.ts` + `@forgewp/react/server` + `IntroBlock.tsx` + `<BlockArea />`), wired `--adapter nextjs` and interactive Next.js selection into `index.js`, `lib/copy-template.js`, `lib/apply-config.js`, `lib/template-files.js`, `package.json`, `pnpm-workspace.yaml`, and `node-runtime.test.js`.
- Tests: `test/functions/next-slice10.test.js` (public adapter registration, `withForgeWP()`, and end-to-end `create-forgewp --adapter nextjs --yes --no-install` -> `exportTheme()` via `wp.config.ts` -> validated ZIP + `php -l`); added to `.github/workflows/nextjs-fixture.yml`.
- Sibling `El-dorado01/forgewp-docs`: published the verified Next.js adapter guide and compatibility matrix (`content/17. Compiler Engine & Architecture/04-nextjs-adapter.md`), updated `03-config-reference.md`, `04-metadata-and-compiler-extensions.md`, and `02-create-forgewp.md`, and rebuilt `lib/docs-data.ts`.

## Validation completed

Latest implementation (Linux VM, Node v24.22.3, PHP 8.2.35, pnpm 10.34.9, WordPress Playground CLI 3.1.65):

- `projects/nextjs-adapter-fixture` builds with `withForgeWP()` and **zero webpack warnings** and passes `tsc --noEmit`.
- `@forgewp/react` typecheck (`tsc --noEmit`), `test:adapter-runtime` (including `nextjs`), `test:adapter-types`, `next-slice10.test.js` (end-to-end `create-forgewp --adapter nextjs` -> `exportTheme()` -> `php -l`), `node-runtime.test.js`, `react-package-exports.test.js`, and `public-api-types.test.js` all passed.
- Full compiler Vitest suite (`test/functions`, `test/hydration`, `test/blocks`, `test/assets`), `test:export-fixture`, and live WordPress Playground + live decoupled Next.js SSR acceptance verified.

## Post-Slice-10 follow-ups

The fixed-route native WordPress + decoupled Next.js workflow, `forgewp init`, adapter-aware `doctor`/`repair`/`clean`/`analyze`, `make:block`/`make:page`/`make:island`, standardized `create-forgewp --adapter nextjs` boilerplates, and the 6 adapter hardening fixes (build-mode/stale `out/` freshness guard, CSS cascade order & per-route scoping, root `app/` link scanning, `<Link>` vs. raw `<a>` identity preservation, import-binding island mapping + conflict/parse diagnostics, and single-pass `out/` extraction — verified by `test/functions/next-adapter-hardening.test.js`) are now implemented and verified. Remaining follow-ups to make the Next.js adapter comprehensive:

1. Dynamic App Router segments (`[slug]`, `[...slug]`) -> WordPress `single.php` / `archive.php` hierarchy template mapping.
2. Smart auto-detection & auto-wrapping of interactive `'use client'` islands during `FORGEWP_NATIVE_EXPORT=1` inside `withForgeWP()` (excluding `src/blocks/`, preserving explicit `<Hydrate>` overrides).
3. `next/image` and `next/font` native WordPress compilation/self-hosting support.
4. WordPress Navigation Menus & Site Info helpers (`wpClient.getMenu()`, `wpClient.getSiteInfo()`) in `@forgewp/react/server`.
5. Optional module parity audit for Next.js (Forms, SEO, Auth, WooCommerce).
6. Turbopack compatibility verification alongside webpack (`next build --webpack` is the verified path today).
7. Remaining shared-framework backlog items in `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` (shorthand object syntax in block editor callbacks, `useWpPageLink` subdirectory fallback normalization, `routing.js` vs. `seed.mockData` `page` reconciliation).

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
