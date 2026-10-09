# Handoff: Hospitality Block PHP Rendering

**Status:** Framework fixes and theme export are complete. The next step is real WordPress installation and acceptance testing; no WordPress activation test has been performed in this environment.

## Project scope and required skills

The active project/theme is in the monorepo's `hospitality/` folder. Work on the Hospitality theme while improving the shared ForgeWP framework in `packages/`; use Hospitality as the real integration/export check for framework changes. Keep the theme source, framework behavior, and sibling `forgewp-docs` documentation consistent. Do not treat this as a framework-only task or move Hospitality-specific implementation into generic framework code unless the behavior is genuinely reusable.

Before continuing, inspect the applicable guidance under `.github/skills/`. In particular:

- `.github/skills/forgewp-development/SKILL.md` — framework implementation, Hospitality integration, tests, export validation, and paired documentation workflow.
- `.github/skills/framework-improvement-brief/SKILL.md` — when reusable framework usability or architecture improvements are discovered; keep the root improvement brief current and remove proposals once implemented and verified.

Other skills may apply to later tasks; check `.github/skills/` rather than assuming this note lists every relevant skill.

## User-reported issues addressed

- Hospitality's exported `licensing-section/render.php` failed PHP parsing because the compiler attempted to translate the editor-only `updateCard` callback into PHP. The callback uses JavaScript constructs such as `.map()`, nested arrow functions, spread syntax, and optional chaining.
- `WpQueryLoop` in block visitor renderers was emitted as static markup, so query-backed blocks could appear populated in previews but not display actual WordPress posts on the visitor site.
- The event archive and legacy theme event blocks were later retired in favor of Events Manager as the only event data source.

## Changes made

- [`packages/compiler/lib/blocks/source-sanitize.js`](packages/compiler/lib/blocks/source-sanitize.js): reject unsupported JavaScript syntax when translating pure helpers to visitor PHP. JSX render helpers remain eligible for the existing inlining path, including supported `.map()` render helpers.
- [`packages/compiler/lib/blocks/php-transpiler.js`](packages/compiler/lib/blocks/php-transpiler.js): emit `WpQueryLoop` as `WP_Query`, including supported query filters and current-post hook output; restore parent post data after loops. Emit motion elements as static HTML while omitting animation-only props.
- [`packages/compiler/lib/generate-theme.js`](packages/compiler/lib/generate-theme.js): pass the generated canvas link and image helpers into the isolated Gutenberg preview evaluator. Without these bindings, blocks using links or images threw a `ReferenceError` and fell back to server rendering. Bound links now prevent navigation while exposing URL editing; nested `WpEditable` labels remain RichText.
- [`packages/compiler/lib/functions/index.js`](packages/compiler/lib/functions/index.js): add the generated PHP image-source resolver and allow raw custom-field retrieval for image sources before escaping at output.
- The homepage event section and `/events` page now render Events Manager shortcodes; event data and booking behavior remain plugin-managed.
- [`packages/compiler/test/blocks/php-rendering.test.js`](packages/compiler/test/blocks/php-rendering.test.js): cover query-loop emission, data hooks and filters, static motion rendering, rejection of unsupported PHP helpers, and preservation of JSX map helper inlining.
- Updated the Gutenberg block guide and API reference in the sibling `forgewp-docs` workspace. The root [`FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`](FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md) no longer lists block query-loop PHP output as an unresolved limitation; local `BlockArea` parsing of serialized Gutenberg content remains open.

## Exported theme

The latest installable package is:

`hospitality/.forgewp/hospitality.zip`

Generated output is only a verification/export artifact. Make future fixes in source files, then re-export; do not edit `.forgewp/out/` or the ZIP manually.

The export can still log warnings such as “Could not convert helper `updateCard` to PHP.” This is expected for editor-only callbacks: the warning is non-fatal, and the unsupported helper should not appear in visitor PHP.

## Validation completed

- `pnpm --filter @forgewp/compiler test` — 45 test files, 320 tests passed.
- `pnpm --filter hospitality typecheck` — passed.
- `pnpm --filter hospitality export` completed and produced `hospitality/.forgewp/hospitality.zip`.
- `php -l` passed for all 82 generated PHP files.
- `forgewp-docs`: `pnpm run typecheck` and `pnpm run build` passed.
- PHP CLI lint (`php -l`) passed for every generated PHP file in `hospitality/.forgewp/out/hospitality`.
- In `forgewp-docs`: `pnpm run typecheck` and `pnpm run build` passed.

## Next agent: WordPress QA

1. Install `hospitality/.forgewp/hospitality.zip` into the local WordPress installation and activate it. Confirm the prior Licensing section parse error is gone and the site loads.
2. In the block inserter, find and insert **Hospitality Hero Section**. Verify the hero canvas appears, its image shows, button labels remain inline-editable, and clicking a button does not navigate; edit each URL through its inline URL popover or block sidebar.
3. Configure Events Manager to use the WordPress pages at `/events` and `/my-bookings`, publish a test event, and confirm the list, single event details, booking form, and bookings page render within the theme layouts.
4. Verify nested `WpQueryLoop` behavior if the theme uses a block loop inside another post context; ensure the outer post context remains correct afterward.
5. If any WordPress behavior fails, change compiler or Hospitality source (not generated output), add a focused regression test, rerun the relevant compiler tests and `php -l`, then re-export the ZIP.
6. Report actual WordPress test results separately from the local compiler/PHP syntax validation above.

## Worktree caution

The monorepo and sibling documentation workspace contain numerous other modified and untracked files from ongoing work. Preserve those changes; do not reset, clean, or overwrite files outside this handoff task.
