# Roadmap: Evolving ForgeWP to a Declarative & JS-Native Configuration

This roadmap describes the design specifications, compiler adaptations, and milestones required to **eliminate `compiler-hooks.js`** and deprecate raw PHP string injection in JavaScript, replacing it with a 100% declarative, compiler-visible configuration layer and structured server escape hatches.

---

## 📐 Proposed Architectural Blueprint

```
                      ┌────────────────────────────────┐
                      │          Developer DX          │
                      │  (TypeScript / React Pages)    │
                      └───────────────┬────────────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            ▼                                                  ▼
┌────────────────────────┐                           ┌───────────────────┐
│     wp.config.ts       │                           │    src/server/    │
│  (Declarative Config)  │                           │(Native PHP Hatch) │
│   - Versioned Config   │                           │ - Custom filters  │
│   - SEO & Sitemaps     │                           │ - Custom routes   │
│   - Schema Mappings    │                           │ - MailPoet API    │
└───────────┬────────────┘                           └─────────┬─────────┘
            │                                                  │
            │           ┌────────────────────────────┐         │
            └──────────►│      ForgeWP Compiler      │◄────────┘
                        │ (Vite / functions-builder) │
                        └──────────────┬─────────────┘
                                       │ (Compiles into)
                                       ▼
                        ┌────────────────────────────┐
                        │      WordPress Theme       │
                        │ (Clean PHP & JSON-LD head) │
                        └────────────────────────────┘
```

---

## 🗓️ Phase-by-Phase Roadmap

### Phase 1: Declarative Schema & SEO Configuration in `wp.config.ts`
**Goal**: Move sitemaps, favicons, and metadata configurations from PHP strings to structured, type-safe TypeScript configurations.

* **1.1 Versioned Configuration**:
  Add configuration schema versioning to support backward compatibility and future migrations:
  ```typescript
  export default defineConfig({
    configVersion: 1, // Explicit versioning for easy upgrades
    name: "Hotelchecker24",
    // ...
  });
  ```
* **1.2 Extend the `defineConfig` Schema**:
  Add standard configuration options inside `@forgewp/compiler`'s configuration type definition:
  ```typescript
  interface ForgeWpConfig {
    configVersion: number;
    favicon?: string;
    seo?: {
      sitemaps?: {
        postTypes: string[];
        taxonomies: string[];
      };
      schemas?: {
        organization?: {
          logo: string;
          socials: string[];
        };
        breadcrumb?: boolean;
      };
    };
  }
  ```
* **1.3 Compiler Diagnostics**:
  Implement static compile-time diagnostics to validate configurations before building the PHP code:
  * ⚠️ Warn if `favicon` file path does not exist in the project directory.
  * ⚠️ Warn if `organization` schema is missing a logo.
  * ⚠️ Check for duplicate sitemap registrations.

---

### Phase 2: Evolve `<WpHead />` using Explicit Mappings (`useWpField`)
**Goal**: Avoid "magical" compiler inference on arbitrary object properties. Make schema mapping explicit and compiler-friendly.

* **2.1 Explicit Field Hooks**:
  Avoid having the compiler guess what `customFields.location` translates to in PHP database queries. Instead, use explicit hooks:
  ```typescript
  const location = useWpField("location"); // Explicitly maps to get_post_meta($id, 'location', true)
  ```
* **2.2 Evolved `<WpHead />` component**:
  Allow developers to pass structured JSON-LD schemas directly as React properties, which are compiled into PHP echo statements:
  ```tsx
  <WpHead
    title={title}
    description={excerpt}
    schema={{
      "@context": "https://schema.org",
      "@type": "Hotel",
      "name": title,
      "address": location, // Mapped via useWpField
      "starRating": {
        "@type": "Rating",
        "ratingValue": useWpField("stars")
      }
    }}
  />
  ```
* **2.3 Template Compilation**:
  The compiler converts the React `<WpHead>` schema object into a static head file (e.g. `single-hotel-head.html`), replacing dynamic JS fields with safe, compiled PHP tags:
  ```html
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Hotel",
      "name": "<?php the_title(); ?>",
      "address": "<?php echo esc_attr(get_post_meta(get_the_ID(), 'location', true)); ?>"
    }
  </script>
  ```

---

### Phase 3: The Server Escape Hatch & Compiler Plugin System
**Goal**: Avoid building a JavaScript-to-PHP transpiler (which is an enormous engineering overhead). Maintain flexibility by providing a clean PHP escape hatch and a plugin system for third-party SEO tools.

* **3.1 Server Escape Hatch (`src/server/`)**:
  * For custom backend behaviors (like the custom MailPoet REST endpoint or custom hooks), provide a dedicated directory: `src/server/` or `php/`.
  * Developers write standard, clean PHP files in this directory. 
  * The compiler automatically scans this directory and merges its contents into the final theme's `functions.php` or templates during build time. This keeps custom PHP separate, highly readable, and out of JavaScript strings.
* **3.2 Modular SEO Integration Plugins**:
  * Avoid hardcoding Yoast or RankMath schemas inside the core compiler.
  * Introduce an integration plugin layer (e.g. `@forgewp/plugin-seo`). 
  * The plugin registers separate SEO adapters (like `YoastAdapter` or `RankMathAdapter`) that run at build time to hook into their respective WordPress filters and merge schema graphs.

---

### Phase 4: Deprecating `compiler-hooks.js` & Roadmap Prioritization
**Goal**: Clean deprecation of the old hook system and aligning priorities.

* **4.1 Deprecation Warnings**:
  Add warnings during the build step if a `compiler-hooks.js` file is detected:
  ```text
  ⚠️ [ForgeWP Compile-Time Warning]: compiler-hooks.js is deprecated. Please migrate custom PHP overrides to the 'src/server/' folder, or declarative 'wp.config.ts' properties.
  ```
* **4.2 Prioritized Development Queue**:
  To ensure stable growth of the compiler, the features are prioritized in this order:
  1. **Compiler Core & Stability** (ensure theme builds are reliable and bug-free)
  2. **Export Stability** (support multiple page layouts)
  3. **Hydration Engine** (hydration island performance optimization)
  4. **Compiler Diagnostics** (wp.config.ts validation and compiler-time warnings)
  5. **Editable Regions** (support Gutenberg blocks and dynamic admin editing)
  6. **WooCommerce Integration** (scaffold basic shop templates)
  7. **Declarative Configuration System** (wp.config.ts schema extensions)
  8. **Server Escape Hatch** (`src/server/` directory integration)
  9. **API Routes Transpilation** (Postponed/Delayed indefinitely to avoid compiler bloating)
