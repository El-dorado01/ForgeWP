# ForgeWP Next.js adapter design brief

This is the starting point for agents implementing the Next.js adapter. It records the product intent, design rules, and the evidence required to call a feature supported. The adapter and mode switch described here are proposed. Check current source and tests before using this brief as an implementation guide. There is no fixed December deadline.

## Product goal

Developers build a Next.js app using the workflows and APIs they already know. Once the app is ready, they choose its deployment mode. In native mode, the intended command is `pnpm forgewp export`, which produces an installable, editable WordPress theme. WordPress serves the frontend and reads live content. The deployed theme requires no Next.js server. In decoupled mode, Next.js serves the frontend and WordPress supplies content and the editor. Both modes come from the same authoring source and use the same WordPress content.

The long-term goal is a one-click switch with minimal disruption. The same project should be able to switch frontend runtimes and switch back without rewriting app source, migrating the database, or losing edits. The product goal is parity with the existing React/Vite adapter's ForgeWP feature set. Compatibility with Next.js itself must be tracked API by API, particularly where runtime behavior depends on a Next.js server.

## Design rules

1. **Keep Next.js in charge of development.** Use ordinary `next dev`, App Router layouts and routes, Server and Client Components, and standard Next.js imports. Adapter detection and native transformations belong in build or export tooling. A starter may make onboarding easier. Its structure should follow ordinary Next.js conventions, and the adapter should avoid imposing a second app tree or router.
2. **Preserve framework APIs where their behavior can be preserved.** Resolve imports and bindings before transforming code. Match `next/link` by module and symbol identity, including aliases, and handle ForgeWP `Link` or `WpLink` according to their own contracts. Avoid global rewrites based on JSX tag names.
3. **Make editing intent explicit.** Reuse `WpEditable`, the block authoring API, and the existing content ownership primitives where their contracts apply. A normal React component can supply presentation. Edits require a declared field, saved WordPress content, or a registered block with a known schema.
4. **Keep deployment choices at the boundary.** Select the mode through export or deployment configuration. Pick the frontend runtime without requiring a source fork or changing where editors work.
5. **Reuse verified shared behavior.** The React adapter provides useful implementation and fixtures, and it is still evolving. Verify the current contract before copying or extracting code. Targeted fixes and additive changes should preserve existing projects and stored content.
6. **Fail visibly when native semantics are unsupported.** Identify the route or source location, API, affected mode, and supported path forward. Only offer a fallback when its behavior is documented and testable. Preserve existing Next.js semantics in decoupled mode wherever the app can run normally.

## Runtime and data ownership

| Context | Frontend renderer | Content source |
| --- | --- | --- |
| Local Next.js development | Next.js App Router | Existing-style local `cms/` fixtures via a proposed Next-compatible data provider |
| Native WordPress | WordPress and the exported theme | WordPress database through native runtime bindings |
| Decoupled | Next.js | The same WordPress content via a server-side integration |
| Gutenberg in either deployment | WordPress editor | The same block definitions, field schemas, and stored values |

Local development must work with no WordPress instance or database. Start by examining the existing CMS fixture conventions and loader. Reuse the data shape where it fits. A Next.js Server Component should be able to read fixture data through a normal server-side boundary during `next dev`. Keep server-only credentials out of client bundles and generated public assets. Preserve useful empty states and fixture defaults.

Distinguish content that intentionally ships as a build-time snapshot from content that must remain live in WordPress. Native export must compile recognized live bindings to WordPress reads so an edit appears without rebuilding. Ordinary Next.js `fetch()` should remain available in authoring and decoupled mode. A live native equivalent for an arbitrary fetch requires an explicit supported mapping.

## Native export compatibility

Start with a pinned App Router version and a fixture for shared layouts and fixed routes. Confirm how the exporter obtains markup, route metadata, and assets. Compare a Next.js build-output integration with a separate export-time renderer. Measure each against route fidelity, CSS and asset loading, and the ability to preserve edit boundaries for WordPress. Keep reliance on private Next.js build formats explicit, versioned, and tested if it proves necessary.

- **Links and routes.** For recognized internal destinations, preserve the link's intent and resolve the WordPress permalink at runtime where configuration can change it. Exercise aliases, external URLs, query strings, fragments, unknown routes, and subdirectory installs. Native navigation can use normal anchors. Next.js prefetch and client transitions belong to the Next.js runtime unless equivalent behavior is implemented and verified.
- **Hooks and interactivity.** Establish semantics per hook. A supported native client component may read the current browser path. `useRouter().refresh()` needs a separately defined contract because it can refresh server-rendered data. Verify whether existing ForgeWP islands can support the chosen authoring patterns and client boundaries.
- **Server features.** Build-time rendering and request-time behavior have different deployment requirements. For Server Actions, route handlers, middleware, ISR, and request-time SSR, preserve the Next.js implementation in decoupled mode where applicable. Native support requires a defined WordPress equivalent with matching lifecycle and permissions, or an export diagnostic. Track dynamic segments and Next.js image, font, metadata, and asset behavior in the compatibility matrix.
- **WordPress output.** Reuse the theme generator and block compiler where their input contracts fit. Keep generated PHP, block metadata, and assets verifiable. Check frontend output after editor saves and on WordPress installs with different URL bases.

## Gutenberg and feature parity

Developers should be able to author native Gutenberg blocks with framework components they already use and expose inline editing through `WpEditable`. Both modes must retain the same block namespace and names, attribute types and defaults, serialized content, and field ownership. Decide how decoupled deployments register the shared block definitions in WordPress. That packaging mechanism is open. It must preserve the editor and saved content through deployment changes.

Keep a parity matrix grounded in the current React adapter and public docs. For each row, record the source API, owner, observed baseline, behavior by mode, and acceptance evidence. Cover routing and layouts, CMS bindings and queries, named fields, saved content and block areas, custom and nested blocks, inline editing, browser interactivity, assets, theme and editor integration, CLI workflows, and applicable integration modules. Check current preview and acceptance status before making public claims. Evaluate Auth, Forms, SEO, and WooCommerce against their actual contracts and deployments.

## Switching modes

The first switch should use the same WordPress database and keep block IDs, namespaces, attributes, post content, and editor configuration intact. Verify URLs, drafts and previews, cache invalidation after updates, and authorization boundaries. Switching should validate both deployments before changing traffic, report a failure clearly, and leave the active deployment recoverable. Define rollback separately from content editing so a failed deployment change does not discard edits.

Initially, prove the switch with explicit deployment steps. Use those steps to design the eventual one-click control and its preconditions. The control's location and deployment mechanism are open decisions.

## First end-to-end milestone

1. Start a standard Next.js starter with `next dev` and local CMS fixtures on a clean machine with no WordPress database. Use a shared layout, a normal `next/link`, an explicit WordPress-content link, and a custom Gutenberg block with a `WpEditable` field.
2. Export from the same app, install the ZIP on disposable WordPress, activate it, and verify routing, assets, block registration, and the rendered page with no Next.js process serving the site.
3. Edit the block inline in Gutenberg. Save, reload the editor, and confirm both the saved value and the visible frontend change without rebuilding.
4. Bring up the decoupled Next.js frontend against the same WordPress installation. Confirm it reads the first edit. Make a second edit in Gutenberg and confirm the decoupled page reflects it.
5. Switch back to native mode. Confirm both edits and block identities survive without changing app source or migrating content. Exercise failure and rollback before presenting the switch as supported.
6. Document the supported API slice and add a clean scaffold and export fixture. Keep the existing React workflow and tests passing.

This milestone proves the architecture. Broader launch support depends on the parity matrix, native compatibility checks, and live WordPress acceptance for the advertised features.

## Agent handoff and React adapter findings

The first implementation investigation is recorded in [the research findings](nextjs-adapter-research.md), with an official-scaffolder fixture and repeatable checks. This does not complete the end-to-end milestone or enable a public Next.js adapter.

Start with the [architecture overview](../architecture.md), [adapter loader](../../packages/compiler/lib/framework-adapter.js), [export pipeline](../../packages/compiler/lib/export-theme.js), [React adapter](../../packages/compiler/lib/react-adapter.js), [theme generator](../../packages/compiler/lib/generate-theme.js), and [block compiler](../../packages/compiler/lib/blocks/index.js). Consult the [historical native and decoupled deployment proposal](../archive/ForgeWP_Unified_Deployment_Architecture.md) for design context. Confirm its claims against today's implementation and tests.

Use the [ForgeWP development skill](../../.github/skills/forgewp-development/SKILL.md) when implementing or documenting behavior. Keep internal proposals here and synchronize the public docs when the implementation and verification exist.

The React adapter is still evolving. If Next.js work exposes a reusable React or shared-framework defect or improvement, follow the [`framework-improvement-brief` skill](../../.github/skills/framework-improvement-brief/SKILL.md) and record it in the [root framework improvement brief](../../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md). Read the current backlog first, trace the finding to source, tests or generated output, and update an existing item when appropriate. Include observed behavior, its user impact, a bounded proposal, and observable acceptance criteria. Mark uncertainty and distinguish passing fixtures from live WordPress verification. Keep the Next.js design discussion here and use the root brief as the shared framework backlog. Recording a finding does not authorize unrelated implementation work.
