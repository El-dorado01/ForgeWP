# ForgeWP — Gutenberg Block Editor Height Issue: Full Context Brief

---

## 1. What Is ForgeWP?

**ForgeWP** is a custom, compiler-driven WordPress theme framework. Developers write their WordPress themes in **React + TypeScript** (using a Next.js-like page and component model), and the framework **compiles** that code into a production WordPress theme.

**Key concepts:**
- Developers write `.tsx` components like `EditorialStrip.tsx`, `HeroSection.tsx`, and arrange them in `src/app/page.tsx`.
- The **ForgeWP compiler** (`packages/compiler/`) reads these files, transpiles them to PHP (`render.php`), generates `block.json`, and builds a WordPress theme with Gutenberg dynamic blocks.
- Each React component annotated with `@forgewp-block` in its JSDoc becomes a **registered Gutenberg block**.
- Blocks are compiled to the theme's `/blocks/<block-slug>/` directory, each containing:
  - `block.json` — block registration settings
  - `render.php` — PHP template that WordPress renders on the frontend AND inside the block editor
- On the frontend, the blocks render correctly because WordPress executes `render.php` natively and serves the HTML through the standard theme stylesheet (`index-[hash].css`).

---

## 2. The Current Problem: Gutenberg Block Editor Height Cutoff

### What works perfectly
- All blocks render **correctly on the visitor-facing frontend**. Full layout, colors, CSS grid, responsive breakpoints — everything works.
- The **width** issue was already solved. Blocks had a previous problem where Gutenberg constrained their width to ~600px in the editor canvas. This was fixed by:
  - Adding `"supports": { "align": ["wide", "full"] }` to `block.json`
  - Setting `"attributes": { "align": { "type": "string", "default": "full" } }` in `block.json`
  - Adding `add_theme_support('align-wide')` in `functions.php`

### What is broken
Inside the **Gutenberg block editor**, blocks are rendered using WordPress's `ServerSideRender` component. This component:
1. Makes an AJAX REST API request to fetch the block's PHP-rendered HTML.
2. Injects the returned HTML into the block editor canvas.
3. The editor canvas (`#editor-canvas`) is an **`<iframe>`** (Gutenberg's isolated editor environment).

The problem is: **the block's content is cut off at approximately 120px of visible height**, even though the actual block content is much taller (400–700px+). The remaining content is hidden/clipped below.

**Critical clue (confirmed by user testing):**
- After a **full hard reload**, some blocks (e.g. Hero Section) briefly show at full height.
- After the user **changes the block's width** (e.g. switching alignment), `ServerSideRender` re-fetches the HTML via AJAX and re-renders it. After this happens, the block's height collapses and the content is clipped — and **never recovers** even if you restore the original alignment.

---

## 3. Root Cause Analysis

### Why the height collapses

Gutenberg's `ServerSideRender` component internally uses `@wordpress/components`'s `Sandbox` component to render dynamic block HTML. The `Sandbox` renders an isolated `<iframe>` and uses JavaScript to **measure the rendered body height** and set the iframe's `height` style property.

The known race condition:
```
REST API response arrives
        ↓
HTML injected into iframe
        ↓
Sandbox/ServerSideRender immediately measures body height  ← TOO EARLY
        ↓
CSS stylesheet (editorStyle / Tailwind variables) finishes loading
        ↓
Layout re-computes and becomes taller
        ↓
Sandbox NEVER re-measures → height stays stuck at initial stale value
```

The measured height on initial CSS-less render (~120px) is what the iframe gets locked to.

### Why inline `<script>` inside render.php does NOT solve it

We tried injecting a resize observer script directly inside `render.php`. This works **once** on the initial page load (when PHP outputs the HTML and the browser executes the script normally).

However when the user resizes the block or changes attributes, `ServerSideRender` re-fetches the HTML via its AJAX endpoint and re-injects it using **React's `dangerouslySetInnerHTML`**. Browsers deliberately **strip `<script>` tags from HTML injected via `dangerouslySetInnerHTML`** as a security measure. Therefore, the resize script is never re-executed and the iframe height stays stale.

---

## 4. What Has Been Attempted (And Why Each Approach Partially Failed)

| Approach | Result |
|---|---|
| `add_editor_style()` in PHP | WordPress processes/strips modern Tailwind CSS variables before injecting — breaks layout |
| `enqueue_block_assets` hook | Loads stylesheet on parent admin page only, not inside the `<iframe>` |
| `block_editor_settings_all` filter | Injects `@import` — style loads inside iframe but timing still causes stale measurement |
| `editorStyle: "file:../../assets/index-[hash].css"` in `block.json` | ✅ Correct approach — stylesheet is now loaded inside iframe. But Sandbox still measures before CSS applies. |
| Inline `<script>` in `render.php` (postMessage + ResizeObserver) | Works on first load only; stripped on AJAX re-renders by `dangerouslySetInnerHTML` |
| React `AutoHeightServerSideRender` wrapper component | Broke `FeaturedHotelsBlockComponent` display — likely prop naming error or React hook issue in non-module script context |
| `wp_add_inline_script('forgewp-editor-script', ..., 'after')` global MutationObserver | **Current active attempt** — runs in parent admin page, watches for iframe additions, attaches ResizeObserver from outside. Has not yet been confirmed to fix the problem. |

---

## 5. Key Files the Agent Should Check

### Compiler — Block Registration
- **`c:\Users\hp\Desktop\ForgeWP\packages\compiler\lib\block-compiler.js`**
  - `compileBlocks()` function (~line 401+)
  - Generates `block.json` and `render.php` for each block
  - Currently injects an inline `<script>` resize observer into every `render.php` — this should probably be **removed** since it doesn't work on re-renders
  - Sets `editorStyle: "file:../../assets/${cssFile}"` in `block.json`

### Compiler — Editor Script & Functions
- **`c:\Users\hp\Desktop\ForgeWP\packages\compiler\lib\generate-theme.js`**
  - `editorScriptContent` template (~line 709+)
  - Generates `forgewp-editor.js` which registers all blocks via `registerBlockType()`
  - Uses `ServerSideRender` to render each block inside the editor
  - Contains an `AutoHeightServerSideRender` component definition (not currently used — reverted to plain `ServerSideRender`)

- **`c:\Users\hp\Desktop\ForgeWP\packages\compiler\lib\functions-builder.js`**
  - `forgewp_enqueue_block_editor_assets()` hook (~line 1591+)
  - Enqueues `forgewp-editor.js` and the Tailwind stylesheet for the editor
  - Currently has `wp_add_inline_script('forgewp-editor-script', ..., 'after')` injecting a global `MutationObserver` to watch all iframes — this is the **currently active fix attempt**

### Live Theme Files (Auto-generated, for inspection/debugging)
- **`C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\assets\forgewp-editor.js`**
  - The compiled editor JavaScript registered via `enqueue_block_editor_assets`

- **`C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\blocks\editorial-strip\render.php`**
  - Example of a compiled PHP block template (EditorialStrip block)
  - Contains the inline `<script>` that is currently ineffective on AJAX re-renders

- **`C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\blocks\hero-section\render.php`**
  - The Hero Section block — first one that showed full height on load before breaking after resize

### Source Block Components (React)
- **`c:\Users\hp\Desktop\ForgeWP\hotelchecker24\src\components\EditorialStrip.tsx`** — has `@forgewp-block` annotation, dark background, 2-col grid, known height issue
- **`c:\Users\hp\Desktop\ForgeWP\hotelchecker24\src\components\HeroSection.tsx`** — also `@forgewp-block`, very tall block with search UI
- **`c:\Users\hp\Desktop\ForgeWP\hotelchecker24\src\app\page.tsx`** — the homepage layout

---

## 6. What the New Agent Should Investigate

The correct fix likely involves one or more of the following:

1. **Gutenberg's `Sandbox` component source** — understand exactly when it measures iframe height, what events trigger re-measurement, and whether there's an officially supported way to force re-measurement after stylesheets load.

2. **`ServerSideRender` `onError` / `onChange` / lifecycle hooks** — determine if there is a callback or prop available to be notified when new HTML is loaded, so the height observer can be re-attached.

3. **Using `wp.components.Sandbox` directly instead of `ServerSideRender`** — `Sandbox` has a `styles` prop that accepts raw CSS strings. If we pass the entire compiled Tailwind CSS as an inline style to `Sandbox`, the stylesheet and HTML arrive together and layout is computed correctly before height measurement.

4. **Checking if `Sandbox`'s `onLoad` event fires after stylesheet parsing** — if the load event fires after `<link>` stylesheets are parsed, then attaching a `postMessage`-based height sender on `load` would work correctly.

5. **Using `ResizeObserver` from the parent page (outside the iframe)** — the current `wp_add_inline_script` MutationObserver approach is architecturally correct and should work if `iframe.contentWindow.document` is accessible (same-origin). The question is whether Gutenberg's sandbox iframe has the same origin as the admin page (`hotelchecker24.local`). If it does, the fix should work.

---

## 7. Environment Details

- **Local site URL**: `http://hotelchecker24.local`
- **Editor page**: `http://hotelchecker24.local/wp-admin/post.php?post=115&action=edit`
- **WP Admin credentials**: `eldorado` / `Adesodiq1@`
- **Framework workspace**: `C:\Users\hp\Desktop\ForgeWP`
- **Theme source**: `C:\Users\hp\Desktop\ForgeWP\hotelchecker24\src`
- **Compiled theme output**: `C:\Users\hp\Desktop\ForgeWP\hotelchecker24\.forgewp\out\hotelchecker24`
- **Live WordPress theme**: `C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24`
- **Build command**: `pnpm run build` (in `C:\Users\hp\Desktop\ForgeWP`)
- **Sync command**: `pnpm sync hotelchecker24` (in `C:\Users\hp\Desktop\ForgeWP`)
