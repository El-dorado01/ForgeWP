# Next.js adapter research fixture

Internal research, not a supported ForgeWP starter or WordPress export.
Created with official create-next-app 16.1.7 (App Router, TypeScript, src directory,
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

The dev command is ordinary Next.js with webpack selected explicitly. The fixture's
webpack extensionAlias handles ForgeWP's .js imports that point to TypeScript source.
Turbopack compatibility is not established. Chrome/Chromium is required for browser
checks; set CHROME_PATH if needed. Browser checks serve the built out directory on an
isolated loopback port, use a temporary browser profile, and close both afterward.

## What this exercises

- Two fixed App Router routes sharing one root layout, global CSS and metadata.
- Async Server Component reads from cms/mock-data.json through a server-only local
  loader. The existing ForgeWP mock loader also reads that same JSON shape.
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
not a WordPress theme. No wp.config.ts is added yet because the compiler has no
Next adapter contract. Neither create-forgewp nor forgewp export accepts Next.js.

The renderer probe is intentionally limited to these two routes. It ignores CSS
imports, substitutes server-only only inside a Node-only research bundle, and
manually composes the root layout. It does not implement RSC or arbitrary Next APIs.
Reports and probe HTML are written to .forgewp/ inside this fixture. Browser evidence
is written to the repository's .forgewp/nextjs-browser/ directory.

On Windows with the pinned Next version, check:browser currently fails its strict
missing-file assertion for /about/__next.about.__PAGE__.txt. Next emits that segment
as a nested file instead. Local editing, navigation, reload, and hydration checks
complete before that assertion. Do not treat the failing asset check as passed or
rewrite the test server to hide it; verify a Linux build and/or a fixed Next version.

No WordPress activation, editor persistence, decoupled transport, live native data,
or deployment switching is implemented or verified here. Public docs remain unchanged.
