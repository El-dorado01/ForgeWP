# Technical Architecture Specification: Declarative `<WpRepeater>` & Dynamic `<WpIcon>`

This document details the robust design and technical specification for implementing declarative repeater loops and dynamic, client-configurable SVGs inside the ForgeWP framework. This solution establishes a high-performance compile-time parser, completely deprecating fragile regular expression overrides in `compiler-hooks.js`.

---

## 📐 Overall System Architecture

The declarative primitives follow a three-tier lifecycle, progressing from the React virtual DOM during development to compiled PHP fragments inside the WordPress theme:

```mermaid
graph TD
    A["Vite Dev Server (React)"] -->|Loads Mock JSON| B["Isomorphic Mock Context"]
    C["Vite Production build"] -->|1. Node SSR Execution| D["Intermediate HTML with Structural Tokens"]
    D -->|2. Compiler Process (generate-theme.js)| E["Compiled Theme PHP Templates"]
    F["Colocated Schemas (defineEditable)"] -->|3. Schema Scanning| G["Dynamic functions.php Meta Registers"]
    E -->|4. Loads DB values| H["Client Browser Hydration"]
```

---

## 📦 Component Contracts & Interfaces

### 1. `<WpRepeater>` Component
The `<WpRepeater>` component manages dynamic meta array loops on the active post context.

* **Package Location**: `packages/react/src/components/WpRepeater.tsx`
* **Props Definition**:
  ```typescript
  export interface WpRepeaterProps<T> {
    name: string;                                    // Post meta key for the repeater
    defaultValue?: T[];                              // Mock values for local dev/Vite SPA
    children: (row: T, index: number) => React.ReactNode; // Render-prop loop
  }
  ```
* **Vite Development Mode**:
  Reads the mock data array corresponding to `name` from `siteSettings.json` or the local post context and maps it directly:
  ```typescript
  if (IS_DEV) {
    const data = postContext?.[name] || defaultValue || [];
    return <>{data.map((row, index) => children(row, index))}</>;
  }
  ```
* **Production SSR Mode (Node)**:
  Renders a single blueprint item wrapped in intermediate parser tags. Property accessors (e.g. `row.value`) are fed with **identifiable compile-time tokens**:
  ```html
  <forgewp-repeater-start name="stats" subfields="value,label">
    <div class="stat-card">
      <h3>__FORGEWP_REPEATER_FIELD_value__</h3>
      <p>__FORGEWP_REPEATER_FIELD_label__</p>
    </div>
  </forgewp-repeater-end>
  ```

---

### 2. `<WpIcon>` Component
The `<WpIcon>` component resolves dynamic SVGs configured by clients in the WordPress Admin metabox.

* **Package Location**: `packages/react/src/components/WpIcon.tsx`
* **Props Definition**:
  ```typescript
  export interface WpIconProps {
    name: string;              // Dynamic icon slug from database (e.g. row.icon)
    provider?: string;         // 'lucide' (default) | 'heroicons' | 'custom'
    className?: string;        // Styling classes
  }
  ```
* **Vite Development Mode**:
  Imports and renders standard React Lucide/Heroicon components dynamically.
* **Production SSR Mode (Node)**:
  Outputs a tokenized structural placeholder tag containing design classes:
  ```html
  <forgewp-icon-placeholder name="__FORGEWP_REPEATER_FIELD_icon__" provider="lucide" class="w-5 h-5" />
  ```

---

## 🛠️ Compiler Integration & Tag Translation (`packages/compiler`)

During the `export` lifecycle, `generate-theme.js` processes page templates using high-performance string replacement parsers:

### 1. Parsing Repeater Blocks
The compiler scans for the custom `<forgewp-repeater-start>` tags:
* **Tag Matching Regex**: `/<forgewp-repeater-start\s+name="([^"]+)"\s+subfields="([^"]+)"\s*\/?>/g`
* **Start Replacement**: Translates to:
  ```php
  <?php
  $repeater_key = '$1';
  $sub_fields = array($2);
  $repeater_rows = forgewp_get_repeater_field($repeater_key, $sub_fields);
  if (empty($repeater_rows)) {
      $repeater_rows = array([seeded_schema_defaults]);
  }
  foreach ($repeater_rows as $row) {
  ?>
  ```
* **Property Token Matching**: Replaces `__FORGEWP_REPEATER_FIELD_([a-zA-Z0-9_-]+)__` inside the loop with:
  ```php
  <?php echo esc_html($row['$1']); ?>
  ```
* **End Tag Replacement**: Translates `</forgewp-repeater-end>` to:
  ```php
  <?php } ?>
  ```

---

### 2. Compiling Dynamic SVGs
The compiler processes `<forgewp-icon-placeholder>` tags dynamically:
* **Token Lookup Scan**:
  The compiler scans the project's React components or config file to collect Lucide icon identifiers used in the app.
* **PHP Helper Code Generation**:
  In `functions.php`, the compiler injects a dynamic SVG render function:
  ```php
  function forgewp_render_theme_icon($icon_slug, $class_name = '', $provider = 'lucide') {
      $svgs = array(
          // Embedded SVGs compiled directly from Lucide SVG source assets
          'award'  => '<svg ... lucide-award>...</svg>',
          'shield' => '<svg ... lucide-shield>...</svg>',
          'globe'  => '<svg ... lucide-globe>...</svg>',
      );
      
      // Load custom developer SVGs defined in wp.config.ts if provider is 'custom'
      $custom_svgs = get_option('forgewp_custom_icons', array());
      if ($provider === 'custom' && isset($custom_svgs[$icon_slug])) {
          $svg = $custom_svgs[$icon_slug];
      } else {
          $svg = isset($svgs[$icon_slug]) ? $svgs[$icon_slug] : '';
      }
      
      echo str_replace('<svg ', '<svg class="' . esc_attr($class_name) . '" ', $svg);
  }
  ```
* **Placeholder Swapping**:
  Replaces `<forgewp-icon-placeholder name="__FORGEWP_REPEATER_FIELD_([a-zA-Z0-9_-]+)__" provider="([^"]+)" class="([^"]+)" />` with:
  ```php
  <?php forgewp_render_theme_icon($row['$1'], '$3', '$2'); ?>
  ```

---

## 🗺️ Implementation Phases

| Phase | Component | Key Task |
| :--- | :--- | :--- |
| **Phase 1** | `@forgewp/react` | Code the `<WpRepeater>` and `<WpIcon>` JSX containers, types, and intermediate token emitters. |
| **Phase 2** | `packages/compiler` | Extend `processMarkup` in `generate-theme.js` to parse repeater loops, register meta fields, and inject SVG icon dictionaries in `functions.php`. |
| **Phase 3** | Blueprints | Integrate the new types and functions in `blueprints.js` so that `wordpress.tsx` self-heals beautifully across existing projects. |
| **Phase 4** | Starters | Synchronize `packages/starter` templates and update project starter packs to showcase pure React repeater loops. |

---

## 🧪 Verification Specs

### 1. Dynamic SVG Verification
```typescript
// Test that standard HTML class interpolations continue to render out-of-the-box:
<i className={`fa fa-${row.icon}`} /> 
// Compiles natively into:
<i class="fa fa-<?php echo esc_attr($row['icon']); ?>"></i>
```

### 2. Static SVG Compilation
```typescript
// Test that static imports:
import { Shield } from 'lucide-react';
return <Shield className="w-5" />;
// Compile cleanly into inline static SVGs in HTML fragments, completely bypassing WpIcon.
```
