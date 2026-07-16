# ForgeWP Block Strategy — Assessment vs. Current State

## Overall Take

The proposal is well-thought-out and philosophically sound. The ownership model is the best part — "one page, one owner" is a clean solution to the otherwise messy co-ownership problem. The long-term vision of ForgeWP as a *compiler that publishes a design system into multiple WordPress experiences* is the right north star.

The framework is surprisingly further along than the proposal implies. But the gap between what exists and what the proposal describes is real, and the critical missing piece is the one the document itself flags as unresolved: **how does a component become a block?**

---

## What's Already Built (Against the Proposal)

| Proposal Feature | Status |
|---|---|
| Native theme compilation (Product One) | ✅ **Fully working** |
| `theme.json` generation | ✅ **Fully working** — reads from `cms/theme.json`, outputs with WP schema |
| `pnpm forgewp make:block <Name>` | ✅ **Fully working** — scaffolds `defineBlock()` component in `src/blocks/` |
| `defineBlock()` API | ✅ **Fully working** — typed, parsed by block-compiler |
| Handwritten blocks compiled to `block.json` + `render.php` | ✅ **Fully working** — `block-compiler.js` already does JSX → PHP transpilation |
| `WpEditable` inside blocks | ✅ **Fully working** — transpiled to editable PHP attribute output |
| Both handwritten and generated blocks kept separate | ✅ **Partially** — `src/blocks/` is the canonical location for handwritten blocks; block-compiler reads from there |
| Block category (`'design'`) | ⚠️ **Hardcoded to `'design'`** — no per-block category support |
| Block preview image | ❌ **Not implemented** |
| Block description / keywords | ❌ **Not in `block.json` output** |
| Curated block library with categories (Marketing, Commerce, Blog) | ❌ **Not implemented** |
| "Generated blocks" separate from "Handwritten blocks" | ❌ **No distinction** — compiler only processes `src/blocks/`, which is the developer's source |
| ForgeWP Builder template (WP page template for Gutenberg canvas) | ❌ **Not implemented** |
| Hybrid templates (React page + Gutenberg slot) | ❌ **Not implemented** — marked advanced/future in proposal |
| Ownership transfer workflow (client takes over a page) | ✅ **Works today** via WP native — not a code feature, just the model |
| Block publish mechanism (explicit opt-in from React components) | ❌ **The unresolved open question** |

---

## The Critical Gap — Block Discovery

This is the heart of the problem and the proposal correctly identifies it as unresolved.

Currently the block-compiler **only knows about `src/blocks/`** — which is where `make:block` scaffolds handwritten blocks. There is **no path** from a regular React component (e.g. `src/components/Hero.tsx`) to a compiled Gutenberg block.

The proposal lists four possible directions:
- Explicit publishing
- Interactive export selection
- Metadata declarations
- Compiler-assisted discovery

### My recommendation: Metadata declarations via `defineBlock()` is the right answer — and it's already half-built.

The `defineBlock()` API already exists. The most natural extension is to allow it to be used from *any* component file, not just `src/blocks/`. The developer explicitly wraps a component in `defineBlock()` to publish it. The compiler then discovers these across the whole `src/` tree, not just `src/blocks/`.

This approach:
- Requires **zero static analysis** of React structure (solves the "Developer B has everything in one file" problem)
- Is **explicit** — developer chooses exactly what gets published
- Is **non-destructive** — the component still works normally in the React app
- Aligns with the existing API the developer already knows

The only design question is: should `defineBlock()` components stay in `src/blocks/` or live anywhere? **Anywhere** is better — it lets developers colocate the block definition with the component it's derived from.

---

## The Second Gap — Block Metadata Quality

Even if discovery is solved, the current `block.json` output is minimal:

```json
{
  "name": "forgewp/hero",
  "title": "Hero",
  "category": "design",     ← hardcoded for all blocks
  "icon": "admin-generic",  ← hardcoded for all blocks
  "attributes": {},
  "render": "file:./render.php"
}
```

The proposal calls for:
- Friendly name ✅ (already auto-generated from component name)
- Description ❌
- Preview image ❌
- Logical category ❌ (all blocks get `"design"`)
- Search keywords ❌

These should come from `defineBlock()` config options:

```tsx
export default defineBlock({
  name: 'hero',
  title: 'Hero Section',
  description: 'Full-width hero with headline, subtext and CTA.',
  category: 'marketing',        // ← new
  keywords: ['hero', 'banner'], // ← new
  icon: 'cover-image',          // ← new (WP dashicons)
  attributes: { heading: 'string', ... }
});
```

---

## The Third Gap — ForgeWP Builder Template

The proposal describes a WP page template called **"ForgeWP Builder"** that:
- Loads the theme header/footer
- Renders Gutenberg content
- Maintains ForgeWP styling

This doesn't exist yet. It's a PHP template file (`page-forgewp-builder.php`) that the compiler should generate into the exported theme — completely passive on the developer's end.

Without it, clients who want to build pages with ForgeWP blocks can only use WP's "Default" template, which may not inherit the theme's full styling context.

---

## What's NOT Missing (But the Proposal Implies Is)

The proposal frames "Generated Blocks" (from React) vs "Handwritten Blocks" (`make:block`) as two separate categories. But in practice, with `defineBlock()` as the explicit opt-in mechanism, **there is no meaningful distinction**. Every published block goes through `defineBlock()`, whether it was scaffolded by `make:block` or hand-written from scratch. The block-compiler treats them identically.

This is actually simpler than the proposal implies — one mechanism, one output path.

---

## Priority Order for Implementation

1. **Extend `defineBlock()` discovery to all of `src/`** — this unlocks the entire "Generated Block Library" concept without any new API surface
2. **Add `category`, `description`, `keywords`, `icon` to `defineBlock()` config + `block.json` output** — makes the block library actually usable by editors
3. **Generate `page-forgewp-builder.php`** during export — gives editors a proper canvas
4. **Block preview images** — lowest priority, can be punted; WP shows a live block preview in the inserter anyway

The hybrid template / Gutenberg slot feature is correctly flagged as advanced and should stay out of scope for now.

---

## Summary

The foundation is solid. `make:block`, `defineBlock()`, `block-compiler.js`, and `theme.json` generation are all real and working. The framework is perhaps 40-50% of the way to what the proposal describes. The remaining work is:

- Solving the discovery problem (extend `defineBlock()` scope to all of `src/`)
- Enriching block metadata (category, description, keywords)
- Generating the ForgeWP Builder page template

None of these are architecturally complex — they're compiler output improvements layered on a working foundation.
