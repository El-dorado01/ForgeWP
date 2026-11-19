# ForgeWP Structured Editable Content Architecture — Agent Handoff Specifications

This document outlines the detailed specifications, constraints, and step-by-step implementation plan for rolling out the **Structured Editable Content Subsystem** in the ForgeWP framework.

---

## 🎯 High-Level Objective

To implement a compiler-driven, schema-first editable content boundary model that separates **Layout Structure (owned by ForgeWP/React)** from **Content Storage & UI Presentation (owned by WordPress/ACF/Meta)**.

---

## 🧱 The 4-Tiered Subsystem Architecture

The system must be built according to the following strict operational tiers:

| Tier | Component | Function & Constraints |
| :--- | :--- | :--- |
| **Tier 1** | **Schema System (Core)** | Canonical schema declarations using colocated `defineEditable` exports inside React components. This is the single source of truth for the compiler. |
| **Tier 2** | **Native WP Meta (Foundation)** | Standard `register_post_meta()` fields automatically enqueued inside `functions.php`. **Universal, always generated, and mandatory** to ensure 100% database portability and fallback resilience. |
| **Tier 3** | **ACF Generation (Primary UI)** | An interoperability presentation adapter. If Advanced Custom Fields (ACF) is active, the theme auto-scaffolds fields via `acf_add_local_field_group()`, hiding standard fields. |
| **Tier 4** | **Lightweight Admin Panels** | Focused admin setting dashboards for telemetry, hydration island diagnostics, caching tools, and version checks. **No large proprietary field-rendering engines.** |

---

## 📋 Technical Implementation Roadmap

### Phase 1: Colocated Schema & Primitives (`@forgewp/react`)
1. Create a `defineEditable` schema compiler function and a type-safe property schema (supporting `text()`, `richText()`, `image()`, `repeater()`, `boolean()`).
2. Implement the isomorphic data hook `useWpMeta` inside framework bindings:
   ```typescript
   export function useWpMeta<T>(key: string, defaultValue: T): T;
   ```
   * **Local Dev (Vite)**: Resolves value from `cms/mock-data.json` under the active context `post.customFields`.
   * **Production (PHP)**: Transpiles directly to `<?php echo get_post_meta( get_the_ID(), 'key', true ); ?>`.

> [!IMPORTANT]
> ### 🔄 The 3-File Synchronization Rule
> Any changes, additions, or updates to framework-level hooks (like `useWpMeta`), primitives, or TypeScript declarations **MUST** be synchronized simultaneously across all three framework locations:
> 1. **Local Project Source**: [wordpress.tsx](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/.forgewp/wordpress.tsx)
> 2. **Framework Starter Pack**: [wordpress.tsx](file:///c:/Users/hp/Desktop/ForgeWP/packages/starter/src/.forgewp/wordpress.tsx)
> 3. **Core Compiler Blueprint**: [blueprints.js](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/blueprints.js) (the fallback template definition)
>
> Remember to run `pnpm run sync:template` after changing the starter pack to propagate configurations to the active CLI templates!

### Phase 2: Schema Parser and Transpiler (`@forgewp/compiler`)
1. Update `packages/compiler/lib/hydration-scanner.js` or write a dedicated schema scanner to parse exported `editable` schemas (`export const editable = defineEditable({...})`) from template page files during build.
2. During the theme export compiler phase (`packages/compiler/lib/generate-theme.js`), transpile the parsed schema into native PHP enqueuers inside `functions.php`:
   * Generate `register_post_meta()` declarations for Tier 2.
   * Generate conditional `acf_add_local_field_group()` arrays for Tier 3.
   * Auto-generate `pll_register_string()` calls for default text keys to bridge strings dynamically into Polylang translation dashboards.

### Phase 3: Activation default seeding
1. Generate a startup installation setup hook inside `functions.php` enqueued on `after_switch_theme` or theme activation.
2. If no custom values exist in the database, automatically seed database meta keys with the fallback default strings defined in the React schemas to guarantee zero cumulative layout shifts (CLS) on raw initial theme loads.

### Phase 4: Bounded block inserts (`<BlockArea />`)
1. Implement the `<BlockArea name="string" />` component.
2. Transpile it to a native Gutenberg block slot `<?php the_content(); ?>` or targeted `innerBlocks` boundary slots, enabling editorial formatting additions while restricting core layout alterations.

---

## 🔍 Verification & Integrity Checks

1. **Local Dev Sandbox Testing**: Verify that `useWpMeta` correctly resolves dynamic fallback values from `mock-data.json` inside the Vite dev preview.
2. **ACF Group Generation Validation**: Export the theme, activate it on the local site, and confirm that ACF automatically registers all fields in the WordPress Admin under the colocated page template contexts.
3. **Graceful Degraded Rendering**: Disable ACF on the local site and verify that the page still renders and operates perfectly using native fallback meta keys.
