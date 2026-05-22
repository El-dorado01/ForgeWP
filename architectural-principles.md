# 🏛️ ForgeWP Architectural Principles & Strategic Roadmap

This document serves as the structural compass, contributor guide, and implementation checklist for the **ForgeWP** platform. It formalizes our shared vision of ForgeWP not as a "React wrapper around WordPress," but as a **compiler-driven native frontend infrastructure.**

---

## 🧭 Core Architectural Principles

### 1. Static-First by Default
Every route, layout, and component must render to high-performance, native server-side PHP/HTML on initial page load. We prioritize traditional server-side rendering over Single Page App (SPA) behaviors to guarantee blisteringly fast time-to-first-byte (TTFB) and perfect SEO.

### 2. Explicit Hydration Boundaries
Client-side interactivity must be opted-into consciously. We leverage the `<Hydrate>` component to define precise islands of dynamic behavior. If a component is not wrapped in a hydration boundary, its React code never enters the client-side JavaScript bundle, keeping production assets clean and minimal.

### 3. Compiler Visibility over Runtime Magic
The framework's primary power lies in compile-time intelligence, not runtime frameworks. Primitives must be designed so the ForgeWP compiler can statically analyze and transpile them into native WordPress functions, rather than relying on heavy client-side JavaScript clients.

### 4. Native WordPress Ecosystem Interoperability
ForgeWP is built to succeed in the real-world WordPress ecosystem. We do not fight or replace WordPress's native subsystems. Components like `<WpHead />` or data operations must yield gracefully to standard WordPress SEO plugins (Yoast, RankMath), custom fields (ACF), and native caching headers.

### 5. Zero Client-Side State Inflation
We reject client-side state managers (Redux, Zustand, React Query) at the global framework level. Data is orchestrated declaratively down through compiler-visible scopes (like `<WpQueryLoop />`). Global options and configs remain static and server-rendered.

### 6. Thin and Swappable Framework Adapters
The compiler's core engine must remain separate from specific frontend UI libraries. While React is our primary focus, our compiler and asset transpiler pipelines should be clean enough to support other ecosystems (Vue, Svelte, or vanilla HTML) in the future.

### 7. Self-Contained Local CMS Simulation
Local theme development must be completely isolated from a running WordPress database. The `cms/` folder (housing `mock-data.json`, `menus.json`, and `theme.json`) serves as our development runtime infrastructure. If a developer can't build and preview their entire layout offline, the simulation layer has failed.

### 8. Developer Ownership of the UI Source Code
We do not impose layout or styling opinions. Primitives like `<WpQueryLoop />` contain zero markup, class names, or opinionated styles. The developer owns 100% of their HTML and CSS structure.

### 9. Isomorphic Declarative Orchestration
Hooks and components must behave like *isomorphic orchestration elements* rather than SPA-style fetch client interfaces. A single unified React query compiles down to native PHP server-side loops on page load, while seamlessly degrading to lightweight client-side REST fetches only if client-side interactions (like load-more or search) are explicitly triggered.

### 10. Compiler Diagnostics as the Primary Safeguard
Rather than relying on runtime error boundaries, we enforce quality, performance, and configuration correctness during the compilation phase. The compiler warns developers of missing metadata, unhydrated loops, or layout size mismatches *before* code is exported.

---

## 🗺️ Strategic Implementation Roadmap & Checklist

Use this checklist to track outstanding features and infrastructure changes required to graduate ForgeWP from a preview framework to a production-ready engineering tool.

### 📦 Phase 1: Core Primitives & Compiler Integration (Tier 1)

#### 1. 🗂️ Local CMS Mock & Schema Upgrades
- [x] **Rich Attachment Support in `cms/mock-data.json`**:
  - Add realistic attachment metadata (ID, title, caption, sizes, aspect ratios) to mock posts to simulate the real WordPress Media Library.
- [x] **Theme Config Sync**:
  - Extend the compilation pipeline to read `wp.config.ts` and automatically generate standard WordPress `theme.json` blocks, eliminating double entry.

#### 2. 🧩 Component Implementations (`packages/react`)
- [x] **`<WpHead />` Component**:
  - Develop standard component accepting `title`, `description`, `ogImage`, and general meta properties.
  - Implement realistic local rendering (injecting simulated tags in Vite index.html during `pnpm dev`).
- [x] **`<WpImage />` Component**:
  - Create standard component accepting `field` (reads from context), `id` (direct attachment ID reference), and `size` ("thumbnail", "medium", "large", "full").
  - Render mock responsive images using local placeholder dimensions during dev.

#### 3. ⚙️ Compiler Transpilation Enhancements (`packages/compiler`)
- [x] **`<WpHead />` Transpiler Rule**:
  - Statically analyze `<WpHead />` usages during compilation.
  - Generate corresponding PHP hook calls inside a custom filter attached to the native `wp_head` or `document_title_parts` actions.
  - Inject active SEO plugin checks (Yoast/RankMath) into the generated theme code to automatically yield metadata ownership in production.
- [x] **`<WpImage />` Transpiler Rule**:
  - Detect `<WpImage />` nodes in the AST.
  - Replace them with native WordPress calls: `wp_get_attachment_image(get_post_thumbnail_id(), 'size', false, $attributes)`.

---

### 📦 Phase 2: Orchestration & Dynamic Hydration (Tier 2)

#### 1. 🎣 State & Option Hooks (`packages/react`)
- [x] **`useWpOption()` Hook**:
  - Create the lookup hook for site options.
  - In simulation: Read values from `cms/theme.json` or `cms/site-settings.json`.
  - In production: Transpile directly to native PHP `get_option('option_name')`.
- [x] **`useWpThemeMod()` Hook**:
  - Implement hook for theme-customizer values.
  - In production: Transpile directly to native PHP `get_theme_mod('mod_name')`.

#### 2. 🔄 Isomorphic Query Engine (`packages/react` & `packages/compiler`)
- [x] **`useWpQuery()` Hook Implementation**:
  - Design the declarative query hook to accept custom post types, limits, and dynamic arguments.
  - Build mock JSON local collection pagination support in `cms/` simulation.
- [x] **Isomorphic Transpiler Engine**:
  - Transpile standard hook usages into structured server-side `new WP_Query(...)` PHP loops.
  - If dynamic pagination (`loadMore`, `hasMore`) or search is used, automatically inject a lightweight client-side fetch client script targeting the `/wp-json/wp/v2/` REST API endpoints.

---

### 📦 Phase 3: Developer Tooling & Diagnostics (Tier 3)

#### 1. 🩺 Advanced Diagnostics Pipeline
- [x] **`forgewp doctor` Extension**:
  - Validate environment variables, package dependencies, entrypoint files, and directory layout correctness.
- [x] **`forgewp analyze` Lint Tool**:
  - Statically scan the project AST to detect:
    - Missing metadata descriptions or titles on major templates.
    - Loop scopes that lack hydration blocks but use dynamic event handlers (e.g. click listeners inside static queries).
    - Hardcoded URLs instead of `useWpPermalink()` declarations.

#### 2. 🧱 React-to-Gutenberg Compiler Block Authoring (Tier 1 DX Focus)
- [x] **`defineBlock()` Manifest API**:
  - Design the API structure allowing React developer-owned edit and save components.
- [x] **Block Output Generator**:
  - Compile the React source files into native WordPress custom blocks, producing compliant `block.json` manifests, editor scripts, asset dependencies, and PHP registers.

---

### 🎯 Decided Architectural Directions & Core Identity Decisions

During our Developer Beta review phase, we finalized three core architecture-defining decisions:

#### 1. Gutenberg In-Canvas Editing vs Sidebar Controls
* **The Decision**: **Structured Hybrid Editing.** Core content primitives (headings, paragraphs, button labels) compile into native inline Gutenberg `<RichText>` canvases using standard AST-analyzable attributes (e.g. `<h2 editable>Hello World</h2>` transforming to dynamic React edit blocks). Layout configurations, custom theme presets, margins, and animation timings live strictly inside the right-hand editor settings panel (`InspectorControls`), preserving compiler sanity while providing editors with maximum visual immediacy.

#### 2. Normalized Shortcode & Core Block Presets
* **The Decision**: **Layered Overridable Typography Normalization.** Under `@forgewp/ui`, we bundle lightweight, modular, and opt-out CSS normalization presets (analogous to the Tailwind Typography plugin approach) targeting classic core class names (`.gallery`, `.gallery-item`, `.gallery-icon`, `.wp-block-columns`). This ensures that legacy shortcode blocks look stunning on first load while keeping them 100% transparent and overridable.

#### 3. Isomorphic Query Simulation Engine
* **The Decision**: **JSON-First by Default, SQLite by Intention.** To preserve our signature zero-dependency local setup, themes start with a simple, Git-friendly mock database (`mock-data.json`). When projects scale to require complex nested queries, large taxonomy queries, dynamic search sorting, or eCommerce joins, developers run `pnpm forgewp db:init` to activate an embeddable SQLite engine, giving them high-fidelity local query simulations seamlessly.
