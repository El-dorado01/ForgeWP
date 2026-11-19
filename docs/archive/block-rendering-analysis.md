# Detailed Analysis: Gutenberg Block Rendering & Height Issues

This document provides a technical overview of how ForgeWP registers, compiles, and renders Gutenberg blocks, explaining the differences between "handcrafted" and "auto-generated" blocks, the root causes of the height/clipping issues, and the exact steps taken to resolve them.

---

## 1. How the Compiler Handles Handcrafted vs. Auto-Generated Blocks

The ForgeWP framework uses two distinct methods for creating block editor components, which affects how they render inside the WordPress admin page:

### Handcrafted Blocks (e.g., `WpEditableArticle.tsx`)
*   **Compilation**: Compiled completely into standard React/JSX blocks. They run fully on the client-side inside the block editor's JavaScript runtime.
*   **Editor Interface**: Handcrafted blocks explicitly implement their edit logic using native Gutenberg components (such as `RichText` and other React inputs).
*   **Editor Rendering**: They are rendered directly inside the Gutenberg editor canvas by React. The markup is rendered dynamically on the client, and styles apply directly to the virtual DOM nodes.

### Auto-Generated Blocks (annotated with `@forgewp-block`)
*   **Compilation**: Auto-generated blocks are built as **dynamic block components**. The compiler splits them into two parts:
    1.  A JS metadata/settings configuration file (`block.json`).
    2.  A PHP server-side template file (`render.php`) created from the block's React component TSX structure.
*   **Editor Interface**: Inside `forgewp-editor.js`, the block editor registers the block using `wp.serverSideRender` (SSR).
*   **Editor Rendering**: Instead of rendering React components directly in JavaScript, Gutenberg requests a server-side preview of the block via the WordPress REST API. The WordPress backend executes the block's `render.php` template on the server and returns static HTML markup, which is then inserted into the editor's DOM canvas.

---

## 2. Why Handcrafted Blocks Rendered Fine, But Auto-Generated Blocks Had Height Clipping

The visual height clipping and content distortion only affected **auto-generated blocks** due to a combination of two distinct issues:

### Issue A: Isolated Editor Canvas Iframe (CSS Delivery Fail)
Modern WordPress block editors isolate the block layout canvas inside an **iframe** to prevent block styles from leaking into and breaking the WordPress admin sidebar/header.
*   **Handcrafted Blocks**: They render pure client-side React elements. They do not rely on server-side layouts, and their styling wrappers are often simple, inline, or already enqueued globally.
*   **Auto-Generated Blocks**: They represent complex site sections (such as Hero Headers or Editorial banners) constructed using **Tailwind CSS**. Because Tailwind classes rely heavily on grid structures, flex layouts, and relative positioning, these blocks require the site's main compiled Tailwind stylesheet (`index.css`) to be present inside the editor canvas iframe.
*   **The Fail**: The compiler was enqueuing styles using `enqueue_block_editor_assets`. This hook loads styles inside the WordPress admin panel head, but **not inside the iframe's isolated document**. Consequently, the stylesheet did not reach the canvas, Tailwind styling was missing, and the blocks lost their layout structures, collapsing or overflowing.

### Issue B: JSX Expression Leakage (Markup Bloat)
Because auto-generated blocks convert TSX elements into `render.php` templates, any React-specific expressions or components must be compiled into standard HTML and PHP.
*   **The Leak**: The compiler did not handle React state variables, event handlers (`onClick`, `onChange`, `onSubmit`), component references (`ref`), React-only attributes (`key`), or unresolvable imported React components (like capitalized icons `<Search />` or custom primitives `<WpLink>`).
*   **The Result**: The raw, uncompiled React code was printed as **literal text** inside the generated `render.php` template. For example, `onClick={() => { setCategoryOpen(...) }}` rendered as plain visible text. This code bloat inflated the DOM nodes, pushed content out of its grid constraints, and made blocks appear broken and truncated.

---

## 3. What Has Been Done/Tried to Fix the Height Issue

We iterated through several stages of debugging to isolate and cleanly resolve the rendering issues without introducing regressions:

### Attempt 1: Sandbox Preview Iframes (Discarded)
*   **Approach**: We tried using a custom `SandBox` React component within Gutenberg that loaded block previews inside individual sub-iframes.
*   **Result**: This resulted in unstable height measurements. Because dynamic content takes time to load, the outer wrapper could not consistently determine the internal height of the sub-iframe, leading to severe layout clipping.

### Attempt 2: Switching to Native SSR
*   **Approach**: We abandoned the custom `SandBox` iframe approach and switched to WordPress's native `wp.serverSideRender` (SSR) utility.
*   **Result**: This resolved height tracking since the blocks render directly inside the main editor canvas DOM. However, it exposed the missing CSS styling and JSX code leakage.

### Attempt 3: Editor Style Registration (Solved Style Delivery)
*   **Approach**: We enqueued editor styles using the native WordPress editor stylesheet registration hooks:
    ```php
    add_theme_support('editor-styles');
    add_editor_style('assets/index-lQPXWWZZ.css');
    ```
*   **Result**: WordPress now automatically reads the main compiled Tailwind CSS file, rewrites its selectors (e.g., prefixing them with `.editor-styles-wrapper` to keep them isolated), and enqueues them **inside the block editor iframe**. Tailwind styling now applies perfectly to the blocks.

### Attempt 4: Clean late/early compiler pipeline (Solved JSX leakage)
*   **Approach**: We updated the block compiler in `block-compiler.js` with robust cleanup passes:
    1.  **Balanced Brace Attribute Stripper**: Runs character-by-character brace matching to cleanly remove complex event handlers (like `onChange={(e) => setSearchTerm(e.target.value)}`) and refs without leaving orphaned curly braces or trailing characters.
    2.  **PHP Tag-Aware HTML Balancer**: We updated `extractJsxByTagBalancing` to skip `<?php ... ?>` blocks, preventing the parser from treating PHP blocks as HTML tags and breaking loop/ternary compilation.
    3.  **Consolidated i18n Regexes**: Re-engineered translation handlers to support multiline text blocks and optional trailing commas, avoiding regex engine backtracking failures.
    4.  **Tag Substitutions**: Automatically convert custom wrapper tags (like `<WpLink>` and `<Button>`) to their native HTML components (`<a>` and `<button>`), and strip unknown capitalized components (like SVG icons).

This ensures the generated `render.php` files contain only clean, valid HTML/PHP markup. The ServerSideRender previews now load perfectly at their natural heights.
