# Next.js adapter: first research slice

Status: experimental fixture and compiler probes, November 20, 2026. This is not
native/decoupled adapter support. The [design brief](nextjs-adapter-design-brief.md)
still governs the intended product.

## Scaffold and authoring

`projects/nextjs-adapter-fixture` was generated with the official
`create-next-app@16.1.7`, then given a workspace dependency on `@forgewp/react`, a
local `cms/mock-data.json`, and an explicit Gutenberg block. It keeps one ordinary
`src/app` tree. Its two async pages consume local fixtures through a `server-only`
module; no WordPress installation, credentials or database are needed.

The prototype uses webpack explicitly and maps `.js` imports to `.ts`/`.tsx` source
because that is how several current ForgeWP modules reference each other. This is
fixture configuration, not a published Next adapter wrapper. No `wp.config.ts`
pretends that `frameworkAdapter: 'nextjs'` exists.

Scaffolding remains a later step: first establish the integration, then have
`create-forgewp` invoke a pinned official scaffolder and apply the verified additions.
An existing-app integration should share that logic and preserve authored files.

## Export contract findings

The adapter loader currently resolves React, HTML and the stub. `export-theme.js`
builds before adapter rendering using `build-assets.js`, which requires a Vite
manifest. `generate-theme.js` copies `dist/assets`. React hydration also consumes
the Vite manifest. Adding a loader entry alone would not make Next export work.

The Next fixture builds with documented `output: 'export'`. This is a comparison
input, not the proposed WordPress output format. A second probe manually renders
the same fixed pages/layout through React in Node.

| Evidence | Next build | Separate renderer probe |
| --- | --- | --- |
| Root layout and local CMS titles | Present | Present |
| Client block's initial content | Present | Present |
| Global stylesheet | Present and resolves | Absent; CSS deliberately ignored |
| Metadata title | Present | Absent; metadata exports not processed |
| Configured trailing slash in Next link | Preserved | Lost |
| Next RSC bootstrap | Present | Absent |
| Recognized live WordPress bindings | Not implemented | Not implemented |

The separate probe explicitly substitutes `server-only` within a Node-only bundle;
it does not preserve RSC isolation or implement async nested components. It must not
be used as an export implementation. Neither probe establishes arbitrary Next API
compatibility or editable identity from rendered HTML.

**Working direction:** retain Next's build as the route/asset/metadata reference;
investigate a source-aware native transformation with explicit live-content and
client-boundary contracts. Do not copy Next's browser runtime into WordPress and
assume it will preserve later WordPress edits. Do not select the separate renderer
as the production path until the observed fidelity losses are addressed.

## Verification so far

- `next dev --webpack` serves both `/` and `/about/` with the expected shared layout
  and fixture content, with no WordPress service running.
- Next production build and its TypeScript check complete. The root package import
  reports a dynamic-dependency warning from `WpIcon`; icon providers are not verified.
- `check:next-output` verifies both routes, layout, CMS titles, links and CSS files.
- `check:renderers` records the comparison above in the fixture's `.forgewp/`.
- The focused compiler test validates the fixture's `forgewp/next-intro` identity,
  heading default, generated RichText callback and escaped PHP attribute read.
  Compilation uses a scratch copy; it does not write generated wrappers into the app.
  The new test and adjacent page-link/local-block-preview tests pass (20 tests);
  the existing React/HTML runtime adapter contract check also passes.
- Headless Chrome completes local heading editing, Next navigation with query and
  fragment, the WordPress-link fallback, and direct route reload without recorded
  runtime/hydration errors. The strict production browser check is **not green**:
  the Windows build lacks the requested `/about/__next.about.__PAGE__.txt` file,
  while emitting `/about/__next.about/__PAGE__.txt`. This matches the upstream
  [Windows static-export report](https://github.com/vercel/next.js/issues/85374).
  The test keeps this failure visible and saves a report before asserting.

No live WordPress acceptance has run. Public docs and adapter selection remain
unchanged. The original end-to-end milestone is still incomplete.

`.github/workflows/nextjs-fixture.yml` runs the compiler probe, Next build, renderer
comparison and strict browser check on Linux for relevant changes and on manual
dispatch. This workflow has been added but has not yet been executed on GitHub.

## Next bounded steps

1. Confirm the pinned fixture in Linux CI and choose the tested version range;
   include the Windows static-export regression in that decision.
2. Define an adapter-owned build result (routes, markup, asset inventory and client
   entries) that can represent both the existing Vite result and Next output.
   Preserve React/HTML fixture behavior before routing export through this contract.
3. Trace module bindings for `next/link`, aliases and explicit WordPress links;
   define native fixed-route permalink mapping, including subdirectory installs.
4. Preserve declared editable/block identities through the native renderer and
   package the existing compiled block definitions. Verify a disposable WordPress
   installation, editor save/reload and frontend updates without a Next process.
5. Add live WordPress data transport for the Next frontend and prove the round trip
   between deployment modes before adding public scaffolding or a switch control.

## Compatibility ledger

### Build dispatch foundation

Export now asks the selected adapter to `buildAssets` or `readBuildAssets`
(`skipBuild`) instead of invoking the Vite builder directly. React and HTML
explicitly reuse the existing Vite implementation. Missing hooks fail clearly;
async implementations are supported. Static rendering remains adapter-owned via
`renderStaticMarkup`.

This is the first part of bounded step 2, not the completed Next build contract.
The result still contains the existing CSS/JS entry paths. Asset copying and client-entry resolution now belong to the adapter `packageAssets` hook.
React and HTML share a Vite helper; theme generation consumes source-file mappings,
island module paths, and the runtime entry. Hydration module URLs now use those
theme-relative paths instead of assuming an `assets/` prefix. Route records and
a Next-compatible native client runtime are still required before Next export can
be enabled. No new adapter selection or scaffolding option is exposed.

Tests cover async dispatch, existing-build reuse, missing hooks, malformed
results, failure propagation, and both existing Vite manifest locations for
React and HTML. The full starter export fixture checks the generated themes.

### Route/markup contract foundation

`ForgeWPStaticMarkup` now supports additive `routes?: ForgeWPStaticRoute[]` and
`layout?: ForgeWPStaticLayout` fields while keeping legacy React and HTML markup
objects unchanged. `renderStaticMarkup` validates the returned markup and route
records (path normalization, duplicate paths, colliding `templateSlug`s, dynamic
bracket segments, and route asset shapes). `export-theme.js` forwards `routes`
and `layout` to `generate-theme.js` and `validate-export.js`, which generate and
validate `page-<templateSlug>.php`, `forgewp-static/template-<templateSlug>.html`,
`forgewp-static/template-<templateSlug>-head.html`, and `functions.php` page
provisioning without requiring `.forgewp/template-*.html` files on disk.
`validate-export.js` also resolves island scanning through the active framework
adapter instead of assuming Vite's `dist/.vite/manifest.json`.

`packages/compiler/lib/next-route-extractor.js` proves fixed-route extraction
from Next's documented static export (`out/`) against `projects/nextjs-adapter-fixture`:
`/` and `/about/` extract shared `<header>` and `<footer>` into `headerHtml` and
`footerHtml`, preserve `<main id="details">` on `/about/`, retain per-route
`<head>` metadata (`<title>`, favicon, JSON-LD) while stripping duplicate
charset/viewport and Next runtime links, verify local stylesheets in
`assets.stylesheets`, and strip/account for Next client chunks and `self.__next_f`
RSC Flight payloads separately without treating them as a native WordPress runtime.
No Next adapter name or `create-forgewp` option is enabled yet.

### Import-binding-aware `next/link` and fixed-route permalink mapping

`packages/compiler/lib/next-link-transform.js` resolves `next/link` by lexical
module/symbol identity via Babel scope (`import Link from 'next/link'`, aliases
such as `NextLink`, `{ default as NavLink }`, and namespace `<NS.default>`),
ignoring shadowed local variables, custom `./Link`, plain `<a>`, and
`@forgewp/react` `Link`/`WpLink` (which are tracked separately). It also traces
`@forgewp/react` `useWpPageLink(slug, fallback)` calls (including aliases).

Static internal destinations (including string literals, static templates, and
static `{ pathname, query, hash }` objects, with or without trailing slashes)
map against known `ForgeWPStaticRoute` records into collision-safe
`__FORGEWP_ROUTELINK:<slug>:<fallback>:<query>:<hash>__` tokens. `markup-processor.js`
compiles those tokens to `forgewp_resolve_route_url()` in `functions.php`, which
resolves live WordPress permalinks via `forgewp_resolve_route_page_id()` (so
wp-admin slug renames work without rebuilding), preserves query strings and
fragments across both Pretty and Plain (`?page_id=N`) permalinks, supports
Polylang localized home URLs, and uses `home_url(...)` fallbacks so subdirectory
installs stay valid. External URLs, `mailto:`/`tel:`, `#hash`, and `?query`
destinations remain verbatim. Unknown internal routes emit a `NEXT_LINK_UNKNOWN_ROUTE`
warning and fall back via `home_url(...)`; dynamic `href` expressions emit an
actionable `NEXT_LINK_DYNAMIC_HREF` error diagnostic instead of silently rewriting.

### Experimental native block, `WpEditable`, `BlockArea`, and ZIP pipeline

`packages/compiler/lib/blocks/index.js` now resolves `block.json` `editorStyle`
from the adapter's theme-relative `assets.cssFile` (instead of assuming Vite's
`assets/index-*.css`), so compiled Gutenberg blocks in non-Vite themes point to
their real packaged CSS. `packages/react/src/components/BlockArea.tsx` also
recognizes `FORGEWP_NATIVE_EXPORT=1` / `globalThis._forgeWpCompileTime` during
Node/SSR builds so `<BlockArea />` compiles to `<?php the_content(); ?>` in
Next.js native export while keeping local dev preview intact.

`packages/compiler/lib/next-export-experimental.js` provides an internal
experimental export harness (`packageNextAssets`, `readCompiledBlockIdentities`,
`exportNextExperimentalTheme`) without adding a public adapter name yet. Against
`projects/nextjs-adapter-fixture`, it packages verified Next CSS (skipping Next
JS client chunks), rewrites import-verified `next/link` and `useWpPageLink`
anchors, compiles `src/blocks/IntroBlock.tsx` (`forgewp/next-intro`), emits a
validated WordPress theme ZIP, proves the real generated `assets/forgewp-editor.js`
registers `forgewp/next-intro` with working `RichText` inline editing in Node VM,
and proves the real generated `blocks/next-intro/render.php` renders live edited
attributes in PHP 8 without rebuilding. Live WordPress activation and Gutenberg
database persistence still require a disposable WordPress acceptance run.

| API / owner | Current evidence | Native WordPress | Decoupled WordPress |
| --- | --- | --- | --- |
| Next App Router fixed routes/layout | Local fixture, Next build, and fixed-route extractor + `generateTheme` integration test | Fixed-route markup/PHP generation & ZIP packaging verified in compiler tests; live WP acceptance pending | Live transport pending |
| Next CSS / metadata | Extracted from `out/`; CSS packaged (single or bundled), head metadata sanitized, RSC/client scripts stripped & inventoried | Packaged CSS + per-route `head.html` verified in compiler tests; live WP acceptance pending | Ordinary Next output only |
| `next/link` / Next | AST binding transform (aliases/namespaces/shadowing/object href), fixture rewrite + PHP 8 runtime tests (root, subdirectory, renamed slug, Plain permalink, deleted fallback, Polylang); Linux emits `/about/__next.about.__PAGE__.txt` (Windows defect remains) | Compiler + PHP 8 stand-in tests passing; live WP acceptance pending | WordPress permalink mapping pending |
| CMS fixtures / ForgeWP | Server-only JSON boundary; existing loader test | Live bindings pending | REST/server transport pending |
| `defineBlock`, `WpEditable`, `BlockArea` / ForgeWP | Compiled in experimental ZIP export with real Next `editorStyle`, verified generated `forgewp-editor.js` RichText VM edit + PHP 8 live `render.php` + SSR `BlockArea` -> `the_content()` | Compiler, editor-VM & PHP 8 stand-in tests passing; live WP Gutenberg save/reload acceptance pending | Shared editor packaging pending |
| `useWpPageLink` / ForgeWP | Traced by lexical binding in Next fixture and resolved via `forgewp_resolve_route_url` in compiler + PHP 8 tests | Live WP acceptance pending | Live permalink integration pending |
| Client Components / Next | One mounted local block preview | Island contract pending (Next client bundles are explicitly NOT enqueued) | Broader boundary tests pending |
| Auth, Forms, SEO, WooCommerce | Existing adapter contracts must be audited | No Next parity claim | No Next parity claim |
| Server Actions, handlers, middleware, dynamic routes, ISR | Dynamic `[...]` segments rejected explicitly by fixed-route extractor | Diagnostic/equivalent required | Next behavior must be verified |

### Open fixture and DX gaps to resolve

1. **Trailing slashes in authored links (`trailingSlash: true`):** The research fixture currently enables `trailingSlash: true` in `next.config.ts` and writes `/about/` in links. Developers should be able to author ordinary `/about` links without trailing slashes regardless of `trailingSlash` config; permalink mapping must normalize both forms, and the Windows `trailingSlash: true` static-export defect ([#85374](https://github.com/vercel/next.js/issues/85374)) should be factored into the recommended Next config/version range.
2. **Typed `cms/mock-data.ts` (`defineWpPosts`) in Next Server Components:** The fixture currently imports legacy `cms/mock-data.json` as a zero-dependency shortcut instead of `cms/mock-data.ts` with `defineWpPosts` (from `@forgewp/react/config`), matching `packages/starter/cms/mock-data.ts`. Switch the fixture and verify server-only bundling without pulling client hooks or triggering `WpIcon` dynamic-dependency warnings.
3. **Page route templates vs. `cms/mock-data` `page` records:** In ForgeWP, route/page files (`src/app/pages/*.tsx` in React, `src/app/**/page.tsx` in Next) own layout/template code, while `cms/mock-data.(ts|json)` owns local WordPress post/page/CPT records (used by `useWpQuery`/context locally and optionally seeded via `seed.mockData`) and `cms/editables/**` owns named page fields. Right now, `getPage()` in the Next fixture bakes `mock-data.json` strings at build time instead of compiling to live WordPress reads, and auto-created WordPress pages (`routing.js`) do not automatically reconcile with `mock-data` `page` records when `seed.mockData` is off. Define one clear, live-bound contract across native and decoupled modes so `cms/mock-data.ts` pages, `cms/editables`, and compiled page templates never conflict or confuse authors.

Reference: [Next static exports](https://nextjs.org/docs/app/guides/static-exports).
