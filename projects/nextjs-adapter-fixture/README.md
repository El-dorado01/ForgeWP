# Next.js adapter research fixture

Internal test fixture for the `nextjs` adapter (`packages/compiler/lib/next-adapter.js`).
It is not the user-facing starter; that is `packages/create-forgewp/template-nextjs`
(`create-forgewp --adapter nextjs`). Created with official create-next-app 16.1.7 (App Router, TypeScript, src directory,
no Tailwind/ESLint, skipped installation/git), then integrated into this workspace.
Next.js 16.1.7 and React 19.2.4 are pinned research versions, not a launch compatibility claim.

## Run from the repository root

```sh
pnpm install --frozen-lockfile
pnpm --filter @forgewp/nextjs-adapter-fixture dev
pnpm --filter @forgewp/nextjs-adapter-fixture build
pnpm --filter @forgewp/nextjs-adapter-fixture check:next-output
pnpm --filter @forgewp/nextjs-adapter-fixture check:renderers
pnpm --filter @forgewp/nextjs-adapter-fixture check:browser
pnpm --filter @forgewp/compiler exec vitest run test/blocks/nextjs-fixture.test.js
```

The dev command is ordinary Next.js with webpack selected explicitly. `withForgeWP()`
in next.config.ts sets the webpack extensionAlias for ForgeWP's .js imports that point
to TypeScript source. Turbopack builds are covered separately by
`packages/compiler/test/functions/next-turbopack.test.js`. Chrome/Chromium is required for browser
checks; set CHROME_PATH if needed. Browser checks serve the built out directory on an
isolated loopback port, use a temporary browser profile, and close both afterward.

## What this exercises

- Two fixed App Router routes sharing one root layout, global CSS and metadata.
- Async Server Component reads from typed cms/mock-data.ts (`defineWpPosts`) through
  a server-only loader (switching to live WordPress REST when `FORGEWP_WP_URL` is set).
- An aliased next/link import with a query and fragment.
- An explicit useWpPageLink content link, using only its local fallback here.
- A client preview of a declared Gutenberg block with a WpEditable heading.
  Local edits are transient React state, not saved WordPress content.
- Existing block compilation in a scratch copy: identity/schema, executable
  RichText callback and PHP reads of saved attributes. It does not register the
  block in a running WordPress installation.

IntroPreview renders the block's save view for SSR and the first client render,
then mounts its editable view. This fixture boundary avoids the current WpEditable
server/client contentEditable discrepancy. It is not a general RSC integration.

## Evidence and limitations

See [the research findings](../../docs/nextjs-archive/nextjs-adapter-research.md).
Next build emits out; that is a static Next site with its own browser runtime,
not a WordPress theme. The compiler tests turn it into a native WordPress theme by
calling `exportTheme({ adapter: nextAdapter })` (see `next-adapter.test.js` and
`next-export-blocks.test.js`). The fixture has no wp.config.ts, so `forgewp export`
is not run here directly; scaffolded projects use `frameworkAdapter: 'nextjs'`.
`@forgewp/compiler` is a workspace devDependency so compiler tests that link this
fixture's node_modules into temporary projects can resolve `define-config`.

The renderer probe is intentionally limited to these two routes. It ignores CSS
imports, substitutes server-only only inside a Node-only research bundle, and
manually composes the root layout. It does not implement RSC or arbitrary Next APIs.
Reports and probe HTML are written to .forgewp/ inside this fixture. Browser evidence
is written to the repository's .forgewp/nextjs-browser/ directory.

On Windows with the pinned Next version, check:browser currently fails its strict
missing-file assertion for /about/__next.about.__PAGE__.txt. Next emits that segment
as a nested file (`out/about/__next.about/__PAGE__.txt`) instead; see Next.js #85374.
This only affects client segment prefetch when out/ is served directly; native
WordPress export strips these RSC payloads. Re-confirmed 2026-11-21. Local editing, navigation, reload, and hydration checks
complete before that assertion. Do not treat the failing asset check as passed or
rewrite the test server to hide it; verify a Linux build and/or a fixed Next version.

This fixture's own scripts do not activate a theme in WordPress. Live WordPress
acceptance (theme activation, Gutenberg edits, decoupled SSR, and the native ↔
decoupled round trip) is in `next-live-wp-acceptance.test.js` and only runs with
`FORGEWP_LIVE_WP_ACCEPTANCE=1` and WordPress Playground available.
