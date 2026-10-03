- Mail/storage failure behavior is explicit: stored-but-unmailed submissions return a received response and log the mail failure; mail failure without storage returns an error; mail success with storage failure is logged. Submitter confirmation is now opt-in, uses a validated developer-owned email field and plain-text body, and logs failures without changing successful submission outcomes. Verify real delivery on staging.
- Native mode sends an admin notification and optionally stores submissions in the private `forgewp_submission` CPT. CSV export, WordPress personal-data exporter/eraser integration, and retention policy remain open.

# ForgeWP Framework UX and Content Model Improvement Brief

**Status:** Proposal for framework investigation and implementation planning  
**Prepared:** 2026-10-03  
**Scope:** ForgeWP React adapter, compiler, CLI, and `forgewp-docs`. This is framework guidance, not Hospitality project documentation.

## Purpose

Use this brief to improve the consistency of the three authoring/runtime environments:

1. Local React/Vite preview.
2. Gutenberg editing in WordPress.
3. The exported visitor-facing WordPress theme.

The goal is not to make every surface behave identically. The goal is to make differences explicit, avoid duplicated content ownership, and help a theme author predict what is stored, previewed, exported, and editable.

This document records behavior observed in the current codebase, proposes changes, and gives acceptance criteria. It does not authorize a broad rewrite or a breaking API change.

## Executive Summary

The highest-value opportunities are:

1. Improve local preview fidelity for serialized Gutenberg content. `BlockArea` currently inserts mock `post.content` as raw HTML; it does not parse Gutenberg block comments. Hospitality works around this by manually rendering the event sections from mock custom fields, which can drift from the actual saved block tree.
2. Define one source of truth for content shared between CPT fields and block attributes. A value duplicated in both places can diverge when an editor changes only one copy.
3. Make template discovery intent explicit. Root `single-<post-type>.tsx` files map to WordPress single templates, while files under `src/app/pages/` are also scanned as Page templates. A helper component placed in `pages/` can unintentionally create an additional Page template.
4. Make block authoring choices easier to understand. `defineBlock()`, `@forgewp-block`, `make:block`, and `make:shell` solve different problems; generators and docs should guide authors to the right one.
5. Make fixture seeding unmistakable. Local mock data is not live WordPress data unless seeding is explicitly configured or invoked.

## Verified Current Behavior

### Content Across Runtime Environments

`@forgewp/react` hooks such as `useWpTitle()` and `useWpCustomField()` read a post from `WpPostContext` supplied by `WpQueryLoop` in local React development. In exported templates, compiler transforms replace these hooks with WordPress/PHP expressions.

`BlockArea` has different behavior by environment:

- In local React development, it reads `post.content` and inserts it with `dangerouslySetInnerHTML`. It does not parse Gutenberg's serialized block comments or invoke registered block renderers.
- During export, the compiler replaces `BlockArea` with WordPress `the_content()`. WordPress parses the saved block tree and invokes dynamic block renderers.

Relevant source: `packages/react/src/components/BlockArea.tsx`, `packages/compiler/lib/render-theme.mts`.

Hospitality's local single-event preview currently reads the slug-matched mock event and manually renders `EventHeroSection`, `EventOverviewSection`, and `EventProgramSection` from mock fields. This proves the visual components render locally; it does not prove the serialized `post.content` block tree renders locally. Relevant source: `hospitality/src/app/components/SingleHospitalityEventPreview.tsx`.

### Mock Data and Live Seeding

`cms/mock-data.ts` provides local preview fixtures and can also be used as input to generated WordPress seeders. Those are separate uses.

- Seeding is disabled unless `wp.config.ts` opts into `seed.mockData` or the project runs the relevant seed configuration workflow.
- The CLI command `pnpm forgewp seed:mock-data` configures WordPress-side mock-data seeding; it does not directly connect to a live site and push records from the terminal.
- Generated seeding is guarded by `WP_DEBUG` by default. The strategy and `developmentOnly` option affect whether and when WordPress inserts fixture content.
- When fixture content is seeded into a post's `content`, Gutenberg serialization comments become saved `post_content`; WordPress can then render them normally, provided the blocks are registered.

Relevant source: `packages/compiler/bin/seed.js`, `packages/compiler/lib/functions/seed-mock-data.js`, `packages/compiler/lib/index.d.ts`.

Docs must distinguish local mock fixtures, generated seed PHP, WP-CLI invocation, and content already authored in wp-admin. Exporting a theme alone should not be described as automatically importing mock entries unless the project's seed configuration says so.

### CPT Routes and Permalinks

`CustomPostTypeConfig` supports developer-owned `rewrite` and `hasArchive` options. For example, a CPT can use `/projects/<post-slug>` while an authored WordPress Page owns `/projects` by setting `hasArchive: false`.

The rewrite base is theme configuration, not a normal per-post admin field. An editor can change an individual post slug; links using `useWpPermalink()` should follow the resulting WordPress permalink. ForgeWP emits rewrite configuration and refreshes rewrite rules once when its configured rewrite/archive signature changes.

Relevant source: `packages/compiler/lib/index.d.ts`, `packages/compiler/lib/functions/index.js`, `packages/react/src/hooks.ts`.

### Page and Single-Template Discovery

The current React adapter uses naming/location conventions:

- `src/app/single-<post-type>.tsx` is discovered as a WordPress single template for that post type. It is not a WordPress Page and should not be described as one.
- Components under `src/app/pages/` are scanned as custom Page templates. A helper component placed there can produce an extra generated Page template even when it is imported by a single template.
- Local Vite routes are a separate concern. A local `:slug` route does not itself create a WordPress Page or CPT single template.

The renderer clears stale generated page/single HTML cache files on export. This does not delete WordPress Pages that were already created on a live installation.

Relevant source: `packages/compiler/lib/render-theme.mts`, `packages/compiler/lib/generate-theme.js`, `packages/compiler/lib/functions/routing.js`.

### Block Authoring Models

These APIs should remain distinct and documented in terms of intent:

- `defineBlock()` authors a block definition with explicit metadata, attributes, edit/save behavior, and optional `innerBlocks`.
- `@forgewp-block` discovers a React component and generates a wrapper. It is convenient for simple props, but inferred attributes and editor behavior are intentionally less expressive.
- `pnpm forgewp make:block` scaffolds a source block file; the generated TSX remains project source to inspect and customize. Export generates WordPress block metadata and PHP output.
- `pnpm forgewp make:shell` scaffolds a parent layout block using `InnerBlocks`. The shell owns arrangement and child constraints. Child blocks remain registered blocks that can also be inserted independently. A shell is not itself an event/page content schema unless explicit attributes are added.

For a shell, explain the concepts separately:

- `attributes`: values stored on the parent block.
- `innerBlocks.allowedBlocks`: which children may be inserted.
- `innerBlocks.template`: starter child structure.
- `innerBlocks.templateLock`: whether editors may add, remove, or move children.
- `innerBlocks.orientation`: editor arrangement direction.
- `shell.className` / `shell.gridClassName`: layout classes, not persisted content fields.

Relevant source: `packages/compiler/bin/make-shell.js`, `packages/compiler/lib/blocks/scanner.js`, `packages/compiler/lib/react-adapter.js`.

## Proposed Improvements

### 1. Add a Realistic Local Gutenberg Content Preview

**Problem:** Local `BlockArea` currently inserts serialized comments as raw HTML. Authors may believe they are seeing the saved Gutenberg blocks when they are actually seeing nothing, hidden comments, or a separate hand-built preview.

**Proposal:** Investigate a local block-content renderer that parses WordPress block serialization and resolves registered ForgeWP blocks to their local preview renderer. Prefer the standard WordPress block serialization parser instead of writing a custom comment/JSON parser. Define behavior for core blocks, ForgeWP static blocks, dynamic blocks, nested `InnerBlocks`, and unknown/unregistered blocks.

If full local rendering is not feasible, make the limitation explicit in the UI and provide a single source for the local preview component instead of silently presenting mock composition as saved block content.

**Acceptance criteria:**

- A fixture containing sibling and nested ForgeWP blocks previews in the same order and hierarchy as WordPress.
- Supported block attributes appear in local preview.
- Unknown blocks produce a clear preview placeholder rather than raw serialized comments.
- Tests cover nested shell/child blocks and malformed or unknown block content.
- Docs clearly state any remaining Local Vite vs Gutenberg differences.

### 2. Establish a Canonical Source for Shared CPT Content

**Problem:** Listing cards may read date/location from CPT custom fields while single-page blocks store date/location/program in their block attributes. Editing one representation can leave the archive and detail page inconsistent.

**Proposal:** Before adding more APIs, select and document the canonical content owner for values shared across views. Options include:

- CPT metadata is canonical; blocks render the metadata and own layout only.
- Block attributes are canonical; archive/query support extracts or hydrates the values reliably.
- Intentional dual hosting maps block attributes to metadata with a documented sync/conflict policy.

Prefer an explicit schema/contract over storing the same value independently in mock fields and block attributes. Define behavior for existing content and migrations before changing public data contracts.

**Acceptance criteria:**

- Date, location, participants, and programme each have one documented owner.
- Editing the canonical value is reflected consistently in both archive and single views.
- Local fixtures model the chosen contract without unexplained duplicate values.
- Any migration preserves existing wp-admin content and has a recovery path.

### 3. Make Template Intent Explicit

**Problem:** File location plus filename determines whether a React component becomes a WordPress Page template or a CPT single template. A reusable implementation component under `src/app/pages/` can accidentally become a second Page template.

**Proposal:** Keep current naming conventions backward-compatible, but consider explicit template intent metadata or a manifest. For example, distinguish `page`, `single`, `archive`, and `component` entries and validate incompatible combinations. Until then, improve diagnostics when a page-scanned file appears to be a helper imported by another template.

**Acceptance criteria:**

- A single template and its implementation component can be authored without generating an unintended Page template.
- Export reports the exact WordPress template file and route each source produced.
- Removing a local template removes it from a fresh export without deleting live WordPress content.
- Tests cover root `single-<post-type>.tsx`, Page components, and helper imports under `src/app/pages/`.

### 4. Improve the Block Authoring Decision Path

**Problem:** Authors must choose among annotations, handwritten `defineBlock()`, `make:block`, and `make:shell`, but generated-source versus generated-output boundaries are easy to confuse.

**Proposal:** Keep all existing mechanisms, but make the CLI/docs recommend a path from the authoring goal:

- simple reusable component with inferred text/number/boolean props: `@forgewp-block`;
- custom fields/editor controls or editor/save split: `defineBlock()` or `make:block` scaffold;
- parent layout around independently usable child blocks: `make:shell` scaffold;
- fixed React layout with normal WP content: `BlockArea`.

Ensure the shell generator can initialize a useful child template from registered blocks and that generated shell children remain individually insertable. Do not make shell-specific child blocks unavailable outside the parent.

**Acceptance criteria:**

- CLI help and docs distinguish generator scaffolding from compiler-generated `block.json`/`render.php`.
- A shell example demonstrates layout-only parent attributes and independent child blocks.
- The generated shell can be exported, inserted, rearranged, and rendered on the front end.
- Docs do not present one project-specific event shell as the framework's general model.

### 5. Make Seeding Safer and More Predictable

**Problem:** A local fixture can look like live WordPress content, while the seeding command modifies project config and the generated PHP seeder is subject to a debug-only safety guard by default.

**Proposal:** Add a dry-run/preview mode showing post types, item counts, slugs, block content, image handling, and whether the current config will seed on activation. Clearly separate "configure seeding", "export seed code", and "run against a database". Keep production insertion opt-in and safe.

**Acceptance criteria:**

- The command makes file changes explicit before/after execution and does not imply it connected to WordPress when it did not.
- The user can preview the exact CPT records and serialized content that would be seeded.
- `once`, `upsert`, `force`, and `developmentOnly` behavior is documented and tested.
- Existing editor-authored posts are not overwritten without an explicit force action.

### 6. Clarify CPT URL Ownership and Conflicts

**Problem:** CPT rewrite bases are developer-owned theme configuration, while post slugs are editor-owned. These are different controls, but the distinction can be unclear. CPT archive paths can also collide with authored Pages.

**Proposal:** Keep global rewrite bases in `wp.config.ts` unless a concrete use case requires admin-managed routing. Improve validation and migration messages for collisions between CPT archive bases, custom Page routes, and existing Pages. Document that `useWpPermalink()` follows an editor-changed item slug but does not dynamically change the CPT base.

**Acceptance criteria:**

- Export warns clearly when a CPT archive conflicts with a configured Page route.
- Changing one post slug updates links that use `useWpPermalink()`.
- Changing a CPT base is explicit, refreshes rules once, and reports potential URL migration implications.
- Docs state that exported route changes do not delete existing WordPress Pages or create redirect policies automatically.

### 7. Make Archive Promotion Policy Explicit

**Problem:** A listing can show more events than the image-led header promotes. For example, a two-item header loop can omit later events even though they appear in the archive list.

**Proposal:** Treat header promotion count and ordering as product decisions: keep a deliberate fixed limit, or add an editor-controlled featured/ordering field. Do not imply all CPT records appear in the header if the query is capped.

**Acceptance criteria:**

- The UI and docs state which events are promoted and how they are ordered.
- Editors can change promoted items only if an explicit supported field/control is implemented.

### 8. Align Native Forms Preview, Validation, and Editor Permissions

Detailed WordPress-first implementation phases and acceptance gates are maintained in [`FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md`](FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md). This section remains the concise improvement backlog; the plan is the implementation handoff.

**Observed behavior:**

- Native forms are declared inline in `wp.config.ts` or discovered from `cms/forms/<name>.ts`. `load-config.js` merges discovered contracts with inline forms; inline configuration wins on duplicate names.
- Developer-owned fields are declared in the contract and are a fixed server allowlist. Optional client-owned fields are seeded in that contract, edited on the generated WordPress Forms admin page, hydrated to `WpFormFields`, and merged into server validation. `WpFormFields` provides developer-owned rendering markup plus the client-managed field list.
- The React `submitWpForm()` local path logs the payload, waits, and simulates success. A field value equal to the `__fail__` sentinel exercises its simulated error response. It does not exercise PHP validation, persistence, or mail delivery.
- `WpFormFields` reads `window._forgeWpMockForms` or `window.forgeWpHydration.forms`. The standard `forgewpVirtualPlugin` bridge injects posts, menus, translations, options, products, and optional auth globals, but no mock-form global. The WordPress hydration path does include form fields. This suggests client-owned fields may render empty in ordinary Vite preview; confirm with a minimal fixture before treating it as reproduced.
- Native form definitions remain developer-owned. The generated Forms screen can edit only explicitly enabled `clientFields`; it is not a form catalog or plugin-form builder.
- In staging, verify that the configured Forms capability maps to the intended WordPress roles. This screen can expose stored submission PII to anyone granted that capability.
- Plugin-created forms have two distinct shortcode paths: developer-authored `<WpShortcode>` compiles to `do_shortcode()` and shows a placeholder in Vite, while a WordPress editor can insert the core Shortcode block into content rendered by `BlockArea`/`the_content()` without a `forms` config entry. The docs now describe both paths. `forms.mode: 'shortcode'` is a developer-authored contract; its `shortcode` config value is not automatically exposed as an editable setting in wp-admin. A developer can make it editable by explicitly sourcing it from page metadata, but that is separate wiring.

**Suggested improvements:**

1. Populate the Vite mock-form global from the same resolved form config used by `WpFormFields`, or provide an explicit local mock adapter. Test the Vite runtime bridge rather than only the component's fallback behavior.
2. Add an opt-in local validation mode that uses the form contract for required fields, email, and select options. Keep the current fast success simulation available, but make clear that it does not test backend behavior.
3. Verify the configured Forms capability against real WordPress roles on staging, including access to list, view, and export stored submissions.
4. Keep plugin shortcode placement and shortcode configuration distinct. Editors can create a plugin form and insert its shortcode with the core Shortcode block in content rendered by `the_content()`. Do not add a ForgeWP shortcode registry/editor unless a demonstrated workflow requires it.
5. For event registrations, evaluate a maintained plugin/add-on stack against capacity, approval/waitlist, confirmation, export, privacy/retention, and separate marketing consent before expanding the general-purpose native forms API.

**Acceptance criteria:**

- A Vite preview with `clientFields.enabled` renders the seeded client fields, and the saved admin field list hydrates in WordPress.
- Local test behavior is clearly distinguished from real server validation, email delivery, and persistence.
- Verify role/capability behavior, stored-submission privacy access, and mail delivery semantics on a real WordPress staging site.
- Verify CSV export, personal-data export/erasure, and WP-Cron retention behavior on a real WordPress staging site before enabling these tools for a client.
- Forms docs distinguish plugin shortcodes authored by developers from shortcodes inserted by editors into WordPress content.

## Recommended Implementation Order

1. Resolve canonical ownership for event fields and update the fixture contract.
2. Improve local block-content preview or make its limitation explicit and avoid duplicate rendering paths.
3. Add template-discovery diagnostics/tests for Page helpers versus root CPT single templates.
4. Improve seed dry-run/reporting without enabling production fixture import by default.
5. Refine CLI/docs for annotation, block, shell, and `BlockArea` choices.
6. Add route collision/migration diagnostics and document rewrite ownership.
7. Decide whether archive header promotion remains capped or becomes editor-configurable.
8. Before implementing event registration, compare a plugin/add-on pilot with a scoped native extension; resolve capacity/approval, export, privacy, and retention requirements first.

## Non-Goals and Guardrails

- Do not automatically seed fixture records into a production database.
- Do not make global CPT permalink bases casually editable by content editors; they affect site routing and migrations.
- Do not remove `defineBlock()`, `@forgewp-block`, `make:block`, or `make:shell` merely to reduce the number of APIs.
- Do not make child blocks dependent on their shell unless the block's design explicitly requires that.
- Do not hand-edit generated `.forgewp/` output.
- Do not document proposed behavior as supported until source, tests, export output, and docs agree.
- Keep framework docs generic; use project-specific examples only in project notes or clearly labeled case studies.

## Validation Checklist for Follow-up Work

- Focused tests for compiler route discovery, block serialization/rendering, and seed generation.
- React package typecheck for public hook/component/type changes.
- CLI smoke tests for `make:block`, `make:shell`, route sync, and seed dry-run.
- Hospitality local route checks for archive and slug-based event details.
- Theme export inspection for the intended `single-<post-type>.php`, rewrite rules, block registration, and seed guards.
- Manual Gutenberg check: insert shell, insert/reorder children, edit fields, save, reload, and inspect visitor output.
- `forgewp-docs` typecheck and production build for documentation changes.
- Report any live-site migration steps separately from generated-theme behavior.
