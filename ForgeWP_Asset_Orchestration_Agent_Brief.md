# ForgeWP Asset Orchestration & Optimization
## Agent Implementation Brief

**Status:** Proposed architecture / implementation plan  
**Priority:** Core ForgeWP foundation  
**Scope:** Images, fonts, CSS, JavaScript, external assets, asset manifests, diagnostics  
**Explicitly excluded for now:** Video optimization/transcoding

---

# 1. Mission

Build a first-class **Asset Orchestration layer** inside ForgeWP.

The goal is not to create a generic image optimizer or a Next.js clone. The goal is for the ForgeWP compiler to understand the application's asset graph and produce the smallest, safest, most appropriate assets for both:

1. Native WordPress theme export
2. Decoupled frontend builds

ForgeWP's strategic documents already identify **asset orchestration as a critical core system**, alongside compiler stability, hydration, manifests, diagnostics and performance. ForgeWP's moat is compiler intelligence and orchestration—not simply React wrappers or runtime abstractions.

The guiding principle is:

> **Developers declare what they need. ForgeWP determines how it should be delivered.**

---

# 2. Architectural Principles

All implementation must preserve ForgeWP's existing identity.

## 2.1 Compiler-first

Prefer compiler-visible declarations, manifests and build-time analysis.

Do not create a large client-side asset runtime.

## 2.2 Static-first

Assets should support static HTML and server rendering wherever possible.

Hydration must not become a requirement merely to optimize an asset.

## 2.3 Minimal runtime

Do not add a global asset runtime just to manage images/fonts.

Use native browser capabilities such as `srcset`, `sizes`, `<picture>`, preload, lazy loading and `fetchpriority`.

## 2.4 Native WordPress compatibility

ForgeWP must work with WordPress's existing Media Library and responsive-image infrastructure.

Do not replace WordPress's image system.

## 2.5 Two deployment targets

The asset system must sit above deployment adapters:

```text
React/Vite Source
       ↓
ForgeWP Asset Graph
       ↓
 ┌───────────────┬────────────────┐
 ↓                                ↓
Native Export                 Decoupled Build
 ↓                                ↓
WP Theme Assets               dist Assets
```

## 2.6 No unnecessary magic

Optimization should be predictable.

Developers should understand when ForgeWP is:

- using WordPress
- optimizing a local asset
- preserving an external asset
- self-hosting a font
- generating responsive variants

---

# 3. Scope

## In scope

### Images
- WordPress Media Library images
- local/static images
- external HTTPS images
- responsive image variants
- WebP/AVIF generation where appropriate
- `srcset`
- `sizes`
- width/height
- lazy loading
- loading priority
- preload where justified
- layout-shift prevention
- compiler diagnostics

### Fonts
- Google Fonts configuration
- remote font loading
- optional self-hosting
- WOFF2 output
- generated `@font-face`
- font preloading
- font usage diagnostics
- unnecessary weight detection

### CSS
- minification
- tree shaking
- deduplication
- chunking
- fingerprinting
- critical asset awareness

### JavaScript
- existing Vite/Rollup optimization
- code splitting
- hydration-aware chunking
- asset graph integration
- unused/unnecessary bundle diagnostics

### SVG
- safe minification
- metadata cleanup where safe
- fingerprinting
- preservation of accessibility and functional SVG features

### Third-party/external assets
- external URL detection
- safe passthrough
- explicit build-time optimization for suitable external images
- future remote optimization strategy, but NOT a ForgeWP proxy service in this phase

### Asset manifest
Generate a machine-readable manifest describing optimized assets and their relationships.

### Diagnostics
Create compiler warnings/errors around asset performance problems.

---

# 4. Explicitly Out of Scope

## Video optimization

Do NOT implement:

- automatic video transcoding
- video compression
- video format conversion
- video CDN infrastructure
- video proxying

For now, videos should simply participate in normal asset handling where necessary.

Third-party video embeds may be addressed later through lazy/embed orchestration, but that is not part of this implementation.

## Remote image proxy infrastructure

Do NOT build a ForgeWP image CDN/proxy service now.

It introduces infrastructure, bandwidth, caching, SSRF, security and abuse-management concerns.

Design the architecture so a remote optimizer could be added later.

---

# 5. Target Developer API

The exact API can be refined during implementation, but the intended model is:

```tsx
<WpImage
  src={hero}
  alt="Modern workspace"
  width={1440}
  height={800}
/>
```

The existing ForgeWP direction already identifies `<WpImage />` as a high-confidence API and expects it to compile toward native WordPress image functions rather than becoming a Next.js-style image proxy.

For normal images, developers should still be able to use:

```tsx
<img src="/logo.svg" alt="ForgeWP" />
```

ForgeWP should not make `<WpImage>` mandatory.

---

# 6. Asset Source Classification

The compiler must distinguish at least these asset classes:

```text
                 Asset
                   │
       ┌───────────┼────────────┐
       ↓           ↓            ↓
 WordPress      Local        External
 Attachment     Static        HTTPS
       │           │            │
       ↓           ↓            ↓
 Native WP      ForgeWP      Passthrough /
 Pipeline       Pipeline      Explicit Optimize
```

This classification is foundational.

---

# PHASE 1 — Asset Graph & Infrastructure
## Priority: CRITICAL

Do this before implementing sophisticated optimization.

## Objective

Create the internal asset model that every later optimization feature uses.

### Tasks

1. Create an Asset Graph abstraction.
2. Detect assets imported through Vite.
3. Detect static/public assets.
4. Detect image/font/CSS/JS/SVG asset types.
5. Detect external HTTPS URLs.
6. Track where assets are used.
7. Track source and output locations.
8. Track asset dimensions where applicable.
9. Generate stable asset identifiers.
10. Integrate the asset graph with both `build` and `export`.

Conceptual model:

```ts
type ForgeAsset = {
  id: string
  type: 'image' | 'font' | 'svg' | 'css' | 'js' | 'external'
  source: string
  output?: string
  external?: boolean
  metadata?: Record<string, unknown>
}
```

Do not lock this exact schema if the existing compiler architecture suggests a better abstraction.

### Acceptance criteria

- Every relevant asset is discoverable.
- Native export and decoupled build use the same asset graph.
- No secret or runtime-only data is embedded.
- Existing projects continue building successfully.

---

# PHASE 2 — `<WpImage>` + WordPress Image Integration
## Priority: CRITICAL

This is the first user-facing feature.

## Objective

Make WordPress images use WordPress's native optimization pipeline correctly.

For a WordPress attachment, ForgeWP should compile toward native WordPress image APIs such as:

```php
wp_get_attachment_image(...)
```

The output should preserve WordPress capabilities including:

- responsive `srcset`
- `sizes`
- width/height
- lazy loading
- image metadata

Do NOT build a parallel WordPress image optimizer.

### Example

```tsx
<WpImage
  src={featuredImage}
  alt={title}
/>
```

should result in appropriate native WP image output.

### Acceptance criteria

- Featured images work.
- Media Library images work.
- Responsive images work.
- Plugin-generated image sizes are respected where possible.
- No unnecessary React runtime is required.

---

# PHASE 3 — Static Image Optimization
## Priority: CRITICAL

## Objective

Optimize local/static raster images during build/export.

Example:

```text
src/assets/hero.jpg
```

The compiler should be able to produce appropriate variants such as:

```text
hero-480.webp
hero-768.webp
hero-1024.webp
hero-1440.webp
hero-1920.webp
```

Exact breakpoints must be derived intelligently rather than blindly generating every size.

### Required capabilities

- dimension detection
- responsive variant generation
- WebP generation
- AVIF generation where appropriate
- quality control
- width/height injection
- `srcset`
- `sizes`
- stable filenames/fingerprints
- caching between builds where possible

### Important

Do not optimize every image into dozens of unnecessary files.

The compiler should generate variants based on actual/useful display sizes.

---

# PHASE 4 — Image Loading Intelligence
## Priority: HIGH

Optimization is not only compression.

ForgeWP should understand loading behavior.

## Above-the-fold images

Potential output:

```html
<img
  fetchpriority="high"
  loading="eager"
  ...
>
```

## Below-the-fold images

Potential output:

```html
<img
  loading="lazy"
  ...
>
```

## Rules

Do NOT simply set `loading="lazy"` on every image.

The compiler should consider:

- page position
- explicit developer hints
- hero/critical-image declarations
- hydration boundaries
- static rendering context

The goal is:

> Load critical assets early; defer non-critical assets.

---

# PHASE 5 — Layout Shift Prevention
## Priority: HIGH

Every optimizable image should have known dimensions where possible.

Example:

```tsx
<WpImage
  src={hero}
  width={1440}
  height={800}
/>
```

should emit dimensions so the browser can reserve space before the resource arrives.

Diagnostics should identify:

```text
⚠ Image missing dimensions
```

when dimensions cannot be safely inferred.

This aligns with ForgeWP's existing zero-layout-shift philosophy.

---

# PHASE 6 — External Image Handling
## Priority: HIGH

External images require special treatment.

Example:

```tsx
<img src="https://example.com/huge-image.jpg" />
```

By default, ForgeWP must NOT download, proxy or rewrite it.

## Mode A — Passthrough

Default:

```tsx
<WpImage src="https://example.com/image.jpg" />
```

means:

> External resource. Preserve the URL.

Useful for:

- third-party CDNs
- dynamically generated images
- services already providing optimization
- assets that must remain remotely hosted

## Mode B — Explicit build optimization

Allow an opt-in mechanism such as:

```tsx
<WpImage
  src="https://example.com/hero.jpg"
  optimize="build"
/>
```

Build process:

```text
External URL
    ↓
Download during build
    ↓
Inspect
    ↓
Generate optimized variants
    ↓
Store in theme/dist
    ↓
Generate responsive output
```

This must be opt-in.

### Safety requirements

Handle:

- unavailable URLs
- redirects
- very large files
- unsupported formats
- timeouts
- invalid content
- authentication-protected URLs
- licensing concerns

Never silently download arbitrary external content.

## Mode C — Future remote optimization

Reserve architecture for:

```text
External image
      ↓
Remote image CDN
      ↓
optimized response
```

But do NOT build the proxy/CDN now.

---

# PHASE 7 — Font Orchestration
## Priority: HIGH

Current ForgeWP behavior allows developers to configure Google Fonts through `wp.config.ts`.

Preserve that DX, but add an optimization strategy.

Conceptually:

```ts
fonts: {
  google: {
    families: [
      'Inter:400,500,600,700',
      'Space Grotesk:400,500,600,700'
    ],
    strategy: 'self-host'
  }
}
```

Supported strategies:

```ts
strategy: 'remote'
strategy: 'self-host'
```

## Remote

Keep Google Fonts URLs.

Useful when developers explicitly want remote hosting.

## Self-host

During build:

```text
Google Fonts config
      ↓
Fetch required font files
      ↓
Store WOFF2 in theme/dist
      ↓
Generate @font-face
      ↓
Reference local files
```

The goal is to eliminate unnecessary third-party font connections for performance-focused projects.

### Font requirements

- Prefer WOFF2.
- Generate only requested weights/styles.
- Generate correct `font-display`.
- Generate local `@font-face`.
- Fingerprint files.
- Integrate fonts into the asset manifest.
- Avoid loading unused font weights.

### Diagnostics

Example:

```text
⚠ Font weight 500 is configured but appears unused.
⚠ Font weight 700 is configured but appears unused.
```

Do not attempt perfect semantic font-usage analysis initially. Start with reliable compiler/build information and expand later.

---

# PHASE 8 — CSS Asset Optimization
## Priority: MEDIUM-HIGH

Integrate CSS into the asset graph.

Tasks:

- minification
- deduplication
- tree shaking
- chunking
- fingerprinting
- dependency tracking
- unused CSS diagnostics where reliable

Do not reinvent Vite's CSS pipeline.

ForgeWP should orchestrate and enhance the existing Vite/Rollup pipeline.

---

# PHASE 9 — JavaScript Asset Orchestration
## Priority: MEDIUM-HIGH

ForgeWP already has:

- Rollup chunk splitting
- hydration boundaries
- compiler-aware code splitting
- static HTML before hydration

The asset system should understand these relationships.

Example:

```text
Page
 ├── static HTML
 ├── hydration island A
 │     └── chunk-A.js
 └── hydration island B
       └── chunk-B.js
```

The compiler should ensure that a page does not ship unrelated JavaScript.

Potential diagnostics:

```text
✓ Static page requires no JS
✓ Island A → 8 KB
✓ Island B → 12 KB

⚠ Large client bundle detected: 286 KB
```

Do not create a global runtime to manage this.

---

# PHASE 10 — SVG Optimization
## Priority: MEDIUM

Optimize static SVGs safely.

Possible operations:

- minification
- metadata cleanup
- whitespace cleanup
- fingerprinting

Do NOT destroy:

- accessibility attributes
- IDs needed by definitions
- animations
- filters
- masks
- embedded styles
- functional semantics

SVG optimization must be conservative.

---

# PHASE 11 — Asset Manifest
## Priority: HIGH

Create a machine-readable asset manifest.

Conceptual example:

```json
{
  "fonts": {
    "inter-400": "/assets/fonts/inter-400.woff2"
  },
  "images": {
    "hero": {
      "src": "/assets/images/hero.webp",
      "srcset": "..."
    }
  },
  "scripts": {
    "home-interactions": "/assets/js/home-interactions.js"
  }
}
```

The exact schema should be designed around the existing ForgeWP manifest architecture.

The manifest should support:

- diagnostics
- deployment
- preload decisions
- WordPress integration
- asset discovery
- future tooling
- debugging

Never include secrets.

---

# PHASE 12 — Performance Diagnostics
## Priority: HIGH

This should become one of ForgeWP's signature features.

At build/export time, generate a performance-oriented report.

Example:

```text
ForgeWP Performance Report

✓ Images optimized: 17
✓ Responsive image variants: 42
✓ Lazy-loaded images: 12
✓ Critical assets: 3
✓ JS chunks: 7
✓ CSS chunks: 3
✓ Fonts self-hosted: 2

⚠ hero.jpg
  Original: 4.8 MB
  Recommended optimized size: < 500 KB

⚠ Image missing dimensions
  src/assets/banner.jpg

⚠ External image detected
  https://example.com/image.jpg

⚠ Unused font weight
  Space Grotesk 700

⚠ Large client bundle
  286 KB
```

Diagnostics should distinguish:

- informational
- warning
- error

Do not fail builds for every warning.

---

# PHASE 13 — Preload & Critical Asset Strategy
## Priority: MEDIUM

Once the asset graph is reliable, ForgeWP can determine critical assets.

Potential candidates:

- hero image
- critical font
- critical CSS
- initial hydration chunk

Generate preload only when there is strong evidence it benefits the page.

Avoid preload abuse.

Example:

```html
<link
  rel="preload"
  as="image"
  href="..."
>
```

or:

```html
<link
  rel="preload"
  as="font"
  type="font/woff2"
  crossorigin
  href="..."
>
```

---

# PHASE 14 — Developer Controls & Configuration
## Priority: MEDIUM

Provide sensible defaults but allow explicit control.

Potential configuration:

```ts
assets: {
  images: {
    formats: ['webp', 'avif'],
    quality: 80,
    responsive: true
  },

  fonts: {
    strategy: 'self-host'
  }
}
```

Do not expose dozens of low-level options initially.

ForgeWP should provide:

> intelligent defaults + escape hatches.

---

# PHASE 15 — Native Export & Decoupled Validation
## Priority: CRITICAL BEFORE RELEASE

Every major asset feature must be tested against both deployment targets.

## Native

```bash
pnpm forgewp export
```

Verify:

- correct theme asset paths
- WordPress image integration
- PHP output
- preload tags
- font files
- cache-safe fingerprints
- no broken URLs

## Decoupled

```bash
pnpm build
```

Verify:

- correct `dist` paths
- responsive images
- fonts
- CSS/JS chunks
- manifest
- external URLs
- no PHP-specific assumptions

---

# 16. Testing Matrix

Test at minimum:

## Images

- JPEG
- PNG
- WebP
- AVIF
- SVG
- transparent PNG
- very large image
- tiny image
- missing image
- external image
- WP Media image

## Fonts

- Google Fonts
- multiple families
- multiple weights
- italic
- variable fonts where supported
- remote mode
- self-host mode

## Deployment

- native export
- decoupled build

## Network simulation

Validate behavior under:

- fast connection
- slow 4G
- slow 3G
- offline/cache scenarios where relevant

The original problem that triggered this work is slow-network image loading. Performance testing must therefore be part of acceptance, not an afterthought.

---

# 17. Recommended Implementation Order

The agent should follow this priority:

```text
1. Asset Graph
       ↓
2. WpImage + Native WP Integration
       ↓
3. Static Image Optimization
       ↓
4. Responsive Images + srcset/sizes
       ↓
5. Loading Priority + Lazy Loading
       ↓
6. Layout Shift Prevention
       ↓
7. External Image Handling
       ↓
8. Font Orchestration / Self Hosting
       ↓
9. Asset Manifest
       ↓
10. Performance Diagnostics
       ↓
11. CSS Orchestration
       ↓
12. JavaScript/Chunk Diagnostics
       ↓
13. SVG Optimization
       ↓
14. Preload/Critical Asset Intelligence
       ↓
15. Advanced Configuration
       ↓
16. Full Native + Decoupled Validation
```

Video optimization remains excluded.

---

# 18. What NOT to Build

The agent must actively avoid turning this into:

- a Next.js Image clone
- a global asset runtime
- a proprietary CDN
- an automatic external-resource proxy
- a video transcoding platform
- a visual performance dashboard before the underlying compiler works
- a massive configuration system
- a replacement for Vite/Rollup
- a replacement for WordPress's Media Library

ForgeWP should orchestrate existing systems and add compiler intelligence.

---

# 19. Definition of Success

This project is successful when a developer can write a normal ForgeWP application without manually worrying about most asset mechanics.

For example:

```tsx
<WpImage
  src={hero}
  alt="ForgeWP"
  width={1440}
  height={800}
/>
```

and configure:

```ts
fonts: {
  google: {
    families: ['Inter:400,600', 'Space Grotesk:500,700'],
    strategy: 'self-host'
  }
}
```

Then run:

```bash
pnpm forgewp export
```

and ForgeWP produces:

- optimized images
- responsive variants
- correct `srcset`
- correct `sizes`
- correct dimensions
- appropriate loading behavior
- optimized/local fonts
- optimized CSS/JS
- fingerprints
- an asset manifest
- useful performance diagnostics
- a lightweight native WordPress theme

without requiring a client-side asset runtime.

---

# 20. Final Architectural Principle

The entire feature should reinforce one of ForgeWP's most important strategic ideas:

> **Compiler APIs and orchestration are more important than runtime abstractions.**

ForgeWP's strategic direction already identifies **asset orchestration** as one of the framework's core identity systems, alongside compiler architecture, static-first rendering, selective hydration, native WordPress compatibility, manifests, diagnostics and minimal JavaScript. fileciteturn1file0 fileciteturn1file5

The end goal is not simply:

> "ForgeWP optimizes images."

It is:

> **ForgeWP understands the assets required by a WordPress application and compiles them into the most appropriate delivery strategy for the deployment target.**

That is the foundation this implementation should build toward.
