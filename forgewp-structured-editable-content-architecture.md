# ForgeWP Structured Editable Content Architecture — AI Agent Implementation Brief

## Project Context

ForgeWP is evolving into:

> “A compiler-driven frontend infrastructure platform for native WordPress.”

The framework is NOT intended to become:

* a page builder,
* a no-code system,
* a Gutenberg replacement,
* or a visual drag-and-drop ecosystem.

ForgeWP’s identity must remain:

* compiler-first,
* static-first,
* hydration-aware,
* developer-centric,
* runtime-light,
* and WordPress-native.

The current architecture already emphasizes:

* React-driven frontend development,
* static-first rendering,
* selective hydration,
* deterministic rendering,
* local-first development,
* and minimal frontend JavaScript.

This document defines the next major architectural subsystem:

# Structured Editable Content Architecture

This system allows clients/admins to edit content safely inside WordPress WITHOUT sacrificing:

* compiler ownership,
* frontend performance,
* deterministic rendering,
* hydration orchestration,
* or architectural clarity.

---

# Core Philosophy

ForgeWP must preserve this separation:

| Concern                 | Owner            |
| ----------------------- | ---------------- |
| Layout/Structure        | ForgeWP Compiler |
| Rendering Orchestration | ForgeWP          |
| Hydration Logic         | ForgeWP          |
| Editable Content        | WordPress        |
| CMS Operations          | WordPress        |
| Content Translation     | Polylang/WPML    |
| UI String Translation   | ForgeWP i18n     |

This separation is CRITICAL.

ForgeWP should NEVER surrender full structural ownership to:

* Elementor,
* Gutenberg,
* Divi,
* or any builder system.

---

# Primary Strategic Goal

The goal is NOT:

> “Make entire pages editable.”

The goal IS:

> “Create structured editable content boundaries while preserving compiler-owned frontend architecture.”

This distinction is foundational.

---

# Target User Experience

Clients/admins should feel like they are:

* editing structured content sections,
* NOT editing raw layouts.

Editors should see intuitive interfaces like:

```text
Hero Section
- Headline
- Subtitle
- CTA Button

Features Section
- Cards
- Icons
- Labels

Testimonials
- Items
- Authors
```

NOT:

* hydration configs,
* React props,
* component internals,
* layout containers,
* or raw schema metadata.

---

# Architectural Direction

ForgeWP should evolve toward:

> “Schema-driven WordPress frontend infrastructure.”

The compiler becomes the single source of truth.

---

# Core Editing Architecture

ForgeWP should support THREE editing layers simultaneously:

| Priority | System                | Purpose                              |
| -------- | --------------------- | ------------------------------------ |
| 1        | ForgeWP Admin UI      | Primary editing experience           |
| 2        | ACF Integration       | WordPress ecosystem interoperability |
| 3        | Native WP Meta Fields | Universal fallback compatibility     |

All three systems should operate on:

* the SAME underlying WordPress meta storage,
* the SAME schema definitions,
* the SAME canonical field keys.

NO duplicate storage systems.

---

# Canonical Schema System

The editable content system should originate from compiler-visible schema declarations.

Example conceptual API:

```ts
defineEditable({
  hero_title: text({
    label: "Hero Title",
    default: "Premium Hotel Discovery"
  }),

  hero_subtitle: richText({
    label: "Hero Subtitle"
  }),

  cta_label: text({
    label: "Button Label"
  })
})
```

This schema becomes:

* the single source of truth,
* compiler-visible,
* type-safe,
* hydration-aware,
* translation-aware,
* and WordPress-compatible.

---

# Responsibilities of the Compiler

From a single schema definition, ForgeWP should generate:

```text
✓ ForgeWP Admin UI
✓ ACF field groups
✓ Native WP meta registration
✓ Default field values
✓ Type inference
✓ Validation rules
✓ REST exposure
✓ Translation awareness
✓ Editor labels
✓ Admin grouping
✓ Runtime bindings
```

This is one of ForgeWP’s strongest long-term architectural opportunities.

---

# ForgeWP Admin UI (Primary Editing Layer)

## Purpose

This is the canonical editing experience.

It should:

* feel modern,
* structured,
* intuitive,
* and safer than page builders.

ForgeWP UI should NOT:

* expose raw layout systems,
* expose component trees,
* or behave like Elementor.

---

# IMPORTANT: ForgeWP Admin UI Should NOT Be Gutenberg Blocks

ForgeWP admin interfaces should:

* NOT rely on serialized Gutenberg blocks,
* NOT use block-driven page structure,
* NOT become block-centric.

Instead:

* use native WordPress admin React panels,
* meta boxes,
* custom sidebar panels,
* or custom admin screens.

This preserves:

* architectural independence,
* deterministic rendering,
* compiler ownership,
* and runtime simplicity.

---

# Recommended UI Placement

## Preferred Default

Inside:

```text
Pages → Home
```

ForgeWP injects:

```text
[ ForgeWP Content ]
```

containing:

* structured fields,
* repeaters,
* image selectors,
* localized content,
* toggles,
* grouped sections.

---

# UI Placement Recommendations

## Right Sidebar

Use for:

* simple settings,
* toggles,
* metadata,
* labels,
* variants.

## Bottom Meta Panel

Use for:

* large structured sections,
* repeaters,
* card groups,
* testimonials,
* complex editable regions.

The system should support BOTH.

---

# ACF Integration Layer

ForgeWP should gracefully integrate with:
Advanced Custom Fields

BUT:

ACF should NOT become the canonical architecture.

ForgeWP owns:

* the schema,
* the compiler visibility,
* the content orchestration.

ACF becomes:

* an interoperability adapter.

---

# Recommended ACF Behavior

If ACF is installed:

ForgeWP should optionally:

* auto-generate field groups,
* sync field definitions,
* prefill defaults,
* optionally hide duplicate ForgeWP UI.

Suggested settings:

```text
ForgeWP Settings

[✓] Use ForgeWP Editor
[✓] Generate ACF Field Groups
[✓] Sync Default Values
[ ] Hide Duplicate ForgeWP Fields
```

---

# Native WP Meta Fields (Fallback Layer)

ForgeWP should also support:

* native `register_post_meta()`,
* standard post meta storage,
* WordPress REST compatibility.

This ensures:

* portability,
* plugin interoperability,
* operational resilience,
* and graceful degradation.

---

# Default Value Seeding

ForgeWP should automatically preload:

* default editable values,
* into WP meta storage,
* during initial compilation/export/setup.

Meaning:

If no value exists:

* ForgeWP seeds defaults automatically.

This prevents:

* empty admin screens,
* incomplete page editing,
* blank frontend sections.

---

# Gutenberg Philosophy

ForgeWP should NOT become Gutenberg-centric.

Gutenberg should become:

> “Optional content augmentation.”

NOT:

> “Primary layout engine.”

---

# Recommended Gutenberg Relationship

ForgeWP templates remain authoritative.

Optional insertion zones can exist.

Example conceptual API:

```tsx
<BlockArea name="content" />
```

Compiler outputs:

```php
<?php the_content(); ?>
```

This allows:

* Gutenberg blocks,
* forms,
* embeds,
* plugin content,
* marketing inserts,
  WITHOUT surrendering full page ownership.

---

# IMPORTANT RULE

Gutenberg blocks should NEVER override the entire compiler-generated template by default.

ForgeWP must preserve:

* deterministic rendering,
* compiler ownership,
* hydration guarantees.

---

# Elementor / Builder Compatibility Philosophy

ForgeWP should NOT attempt:

* full Elementor ownership,
* full Divi interoperability,
* or builder-first rendering.

Reason:

* builders assume layout ownership,
* ForgeWP assumes compiler ownership.

These philosophies fundamentally conflict.

---

# Recommended Builder Strategy

Support:

* isolated builder islands,
* optional insertion regions,
* bounded editable zones.

DO NOT:

* make the entire page builder-controlled.

---

# Internationalization Architecture

ForgeWP still requires its own i18n layer.

This is EXTREMELY important.

---

# Two Distinct Translation Categories

## 1. Editorial Content

Handled by:
Polylang
or
WPML

Examples:

* editable content,
* CMS fields,
* posts,
* products,
* options,
* page content.

---

## 2. Compiler-Owned UI Strings

Handled by:
ForgeWP i18n.

Examples:

```tsx
__('Loading...')
__('Read More')
__('Submit')
__('No products found')
```

These are:

* application/frontend strings,
* NOT editorial content,
* NOT CMS-managed content.

---

# Plugin Compatibility Strategy

ForgeWP should remain:

* WordPress-native operationally,
* modern architecturally.

---

# Critical Compatibility Requirements

ForgeWP MUST preserve:

```php
wp_head()
wp_footer()
the_content()
```

As well as:

* native template hierarchy,
* enqueue systems,
* hooks/actions,
* WP query lifecycle,
* conditional tags.

This is mandatory for plugin interoperability.

---

# Plugins Expected To Work Well

Likely compatible:

* WooCommerce
* Yoast SEO
* Rank Math
* Contact Form 7
* Gravity Forms
* WPForms
* Polylang
* WPML

Assuming native WP conventions are preserved.

---

# Plugins Likely To Be Problematic

## Full Page Builders

Potential conflicts:

* Elementor
* Divi
* Bricks Builder

Reason:

* layout ownership conflicts.

---

## DOM-Rewriting Optimization Plugins

Potential issues:

* hydration mismatches,
* script ordering conflicts,
* runtime mutations.

---

## Builder-Centric Frontend Plugins

Potential problems:

* aggressive client-side DOM manipulation,
* injected runtime behavior,
* uncontrolled frontend mutations.

---

# What ForgeWP Must Protect

Above all else, ForgeWP must protect:

```text
✓ Compiler ownership
✓ Deterministic rendering
✓ Static-first rendering
✓ Runtime minimalism
✓ Hydration orchestration
✓ Explicit boundaries
✓ Native WP compatibility
✓ Structured editing
```

These are the real long-term moats.

NOT:

* visual builders,
* drag-and-drop systems,
* generic component APIs.

---

# What Success Looks Like

The implementation should feel like:

## For Developers

```text
Modern frontend engineering for WordPress.
```

## For Clients

```text
Safe, intuitive content editing without breaking layouts.
```

## For WordPress

```text
Operationally native and plugin-compatible.
```

## For Frontend Performance

```text
Minimal JavaScript by default.
```

---

# Final Strategic Direction

ForgeWP is evolving toward:

> “A schema-driven compiler platform for modern WordPress frontend architecture.”

Where:

* ForgeWP owns structure,
* WordPress owns content,
* the compiler orchestrates the boundaries,
* and modern frontend engineering coexists with native WordPress interoperability.

This direction must remain:

* compiler-first,
* performance-first,
* explicit over magical,
* and runtime-light.
