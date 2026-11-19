# ForgeWP Bounded Editing — Implementation Roadmap

> **North Star Principle:** *The developer owns structure. The client owns properties.*

This roadmap implements the "third editing paradigm" — schema-driven property editing within immutable block compositions. It is split into three phases: ship the compiler fix, evolve the developer API, and solve render-side binding.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Developer API  (what devs write)          │
│                                                     │
│  editable.text()  editable.color()  editable.image()│
│  <WpEditable>     <WpImage>                         │
├─────────────────────────────────────────────────────┤
│  Layer 2: Compiler Schema  (internal IR)            │
│                                                     │
│  { type: 'string', control: 'color', default: '#…' }│
├─────────────────────────────────────────────────────┤
│  Layer 3: Target Adapter  (WordPress today)         │
│                                                     │
│  ColorPalette, MediaUpload, ToggleControl, etc.     │
│  render.php → $attributes['bgColor']                │
└─────────────────────────────────────────────────────┘
```

The developer never writes WordPress editor code. The compiler generates everything.

---

## Phase 1 — Ship the Compiler Fix (Ship Value Now)

**Goal:** Clients can edit colors, images, toggles, URLs, and selects in the WordPress block sidebar. No API changes — just finish the existing plumbing.

**Estimated scope:** ~80 lines changed across 2 files.

---

### 1.1 — Expand WP component imports in the editor script

**File:** [generate-theme.js:L713](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/generate-theme.js#L713)

**Current state:**
```js
const { PanelBody, TextControl, Placeholder, Spinner, SandBox } = wp.components;
```

**Target state:**
```js
const { PanelBody, TextControl, ToggleControl, SelectControl,
        RangeControl, Placeholder, Spinner, SandBox, Button,
        ColorPalette, BaseControl } = wp.components;
const { MediaUpload, URLInput } = wp.blockEditor;
```

These are all standard WordPress Gutenberg components that ship with every WP install. No dependencies to add.

---

### 1.2 — Replace "everything is TextControl" with a control-type switch

**File:** [generate-theme.js:L859-L866](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/generate-theme.js#L859-L866)

**Current state:**
```js
const controls = Object.keys(block.attributes).map(key => {
    return createElement(TextControl, {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: attributes[key],
        onChange: (val) => setAttributes({ [key]: val })
    });
});
```

**Target state:**
```js
const controls = Object.entries(block.attributes)
  .filter(([key]) => key !== 'align')  // skip internal WP attributes
  .map(([key, config]) => {
    const label = config.label || key.replace(/([A-Z])/g, ' $1')
                                     .replace(/^./, s => s.toUpperCase());
    const control = config.control || 'text';

    switch (control) {
      case 'color':
        return createElement(BaseControl, { label: label, key: key },
          createElement(ColorPalette, {
            value: attributes[key],
            onChange: (val) => setAttributes({ [key]: val })
          })
        );

      case 'image':
        return createElement(BaseControl, { label: label, key: key },
          createElement(MediaUpload, {
            onSelect: (media) => setAttributes({
              [key]: { id: media.id, url: media.url, alt: media.alt || '' }
            }),
            allowedTypes: ['image'],
            value: attributes[key]?.id,
            render: ({ open }) => createElement('div', null,
              attributes[key]?.url
                ? createElement('img', {
                    src: attributes[key].url,
                    style: { maxWidth: '100%', marginBottom: '8px' }
                  })
                : null,
              createElement(Button, {
                onClick: open,
                variant: 'secondary'
              }, attributes[key]?.url ? 'Replace Image' : 'Select Image')
            )
          })
        );

      case 'url':
        return createElement(TextControl, {
          key: key,
          label: label,
          value: attributes[key] || '',
          onChange: (val) => setAttributes({ [key]: val }),
          type: 'url'
        });

      case 'toggle':
        return createElement(ToggleControl, {
          key: key,
          label: label,
          checked: !!attributes[key],
          onChange: (val) => setAttributes({ [key]: val })
        });

      case 'select':
        return createElement(SelectControl, {
          key: key,
          label: label,
          value: attributes[key],
          options: (config.options || []).map(opt =>
            typeof opt === 'string' ? { label: opt, value: opt } : opt
          ),
          onChange: (val) => setAttributes({ [key]: val })
        });

      case 'number':
        return createElement(RangeControl, {
          key: key,
          label: label,
          value: attributes[key] || 0,
          onChange: (val) => setAttributes({ [key]: val }),
          min: config.min || 0,
          max: config.max || 100
        });

      case 'richText':
      case 'text':
      default:
        return createElement(TextControl, {
          key: key,
          label: label,
          value: attributes[key] || '',
          onChange: (val) => setAttributes({ [key]: val })
        });
    }
  });
```

---

### 1.3 — Strip `control` / `label` / `options` from block.json output

The `control`, `label`, `options`, `min`, `max` fields are compiler hints — they must NOT appear in `block.json` (WordPress won't understand them).

**File:** [block-compiler.js:L888-L894](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js#L888-L894)

When writing `block.json`, strip compiler-internal fields from each attribute:

```js
// Before writing block.json, clean attributes of compiler-only metadata
const cleanAttributes = {};
for (const [key, attr] of Object.entries(blockJsonSettings.attributes || {})) {
  const { control, label, options, min, max, ...wpAttr } = attr;
  cleanAttributes[key] = wpAttr;
}
blockJsonSettings.attributes = cleanAttributes;
```

But pass the **full** attributes (including `control`) to `window.forgeWpBlocks` so the editor script can read them for the switch statement above.

---

### 1.4 — Verification

After Phase 1, this block definition should produce a working sidebar with mixed controls:

```tsx
export default defineBlock({
  name: 'hero',
  title: 'Hero Section',
  category: 'design',
  icon: 'cover-image',
  attributes: {
    heading:   { type: 'string',  default: 'Welcome',  control: 'text',   label: 'Heading' },
    heroImage: { type: 'object',  default: {},          control: 'image',  label: 'Hero Image' },
    bgColor:   { type: 'string',  default: '#1a1a2e',  control: 'color',  label: 'Background' },
    ctaUrl:    { type: 'string',  default: '',          control: 'url',    label: 'CTA Link' },
    showBadge: { type: 'boolean', default: true,        control: 'toggle', label: 'Show Badge' },
  },
  edit: (props) => <HeroSection {...props.attributes} />,
  save: () => <HeroSection />
});
```

**Test checklist:**
- [ ] Compile the theme with `forgewp build`
- [ ] Open WordPress admin → Pages → Edit with blocks
- [ ] Insert the Hero block
- [ ] Verify sidebar shows: TextControl, image uploader, color picker, URL input, toggle
- [ ] Change values → verify server-side rendered preview updates
- [ ] View the page on frontend → verify attributes render correctly

---

## Phase 2 — Evolve the Developer API (Build the Foundation)

**Goal:** Eliminate schema duplication. Make the developer API feel like natural React — CMS-agnostic function calls instead of WordPress config objects.

**Estimated scope:** ~150 lines across `hooks.ts` + `index.ts`, minor compiler adjustments.

---

### 2.1 — Add new editable field types to hooks.ts

**File:** [hooks.ts:L715-L785](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/hooks.ts#L715-L785)

Extend the existing `FieldBase` type union and add new factory helpers:

```ts
// Add to FieldBase.type union:
type: 'text' | 'richText' | 'image' | 'repeater' | 'boolean' | 'color' | 'url' | 'select' | 'number';

// New interfaces
export interface ColorField extends FieldBase<string> {
  type: 'color';
}

export interface UrlField extends FieldBase<string> {
  type: 'url';
}

export interface SelectField extends FieldBase<string> {
  type: 'select';
  options: (string | { label: string; value: string })[];
}

export interface NumberField extends FieldBase<number> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

// Update EditableField union:
export type EditableField =
  TextField | RichTextField | ImageField | BooleanField |
  RepeaterField | ColorField | UrlField | SelectField | NumberField;

// New factory functions (CMS-agnostic — no WordPress in the name):
export function color(options: Omit<ColorField, 'type'> = {}): ColorField {
  return { type: 'color', ...options };
}

export function url(options: Omit<UrlField, 'type'> = {}): UrlField {
  return { type: 'url', ...options };
}

export function select(options: Omit<SelectField, 'type'>): SelectField {
  return { type: 'select', ...options };
}

export function number(options: Omit<NumberField, 'type'> = {}): NumberField {
  return { type: 'number', ...options };
}
```

---

### 2.2 — Export new helpers from the public API

**File:** [index.ts:L73-L77](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/index.ts#L73-L77)

```ts
export {
  // existing
  text, richText, image, boolean, repeater,
  // new
  color, url, select, number,
} from "./hooks";

export type {
  // existing
  EditableField, EditableSchema, TextField, RichTextField,
  ImageField, BooleanField, RepeaterField, ImageFieldVal,
  // new
  ColorField, UrlField, SelectField, NumberField,
} from "./hooks";
```

---

### 2.3 — Make the compiler read `defineEditable` schemas as block attributes

**File:** [block-compiler.js:L582-L596](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js#L582-L596)

Today `parseDefineBlock()` only reads the `attributes: {}` key from `defineBlock()`. Add a fallback that also scans for `defineEditable()` in the same file and merges those fields into attributes:

```js
// After parseDefineBlock, also check for defineEditable schema
if (code.includes('defineEditable(')) {
  const editableSchema = parseDefineEditable(code);
  if (editableSchema) {
    for (const [key, field] of Object.entries(editableSchema)) {
      if (!settings.attributes[key]) {
        settings.attributes[key] = mapEditableFieldToAttribute(field);
      }
    }
  }
}
```

Where `mapEditableFieldToAttribute` converts:
```
text()     → { type: 'string', control: 'text' }
richText() → { type: 'string', control: 'richText' }
image()    → { type: 'object', control: 'image' }
color()    → { type: 'string', control: 'color' }
url()      → { type: 'string', control: 'url' }
boolean()  → { type: 'boolean', control: 'toggle' }
select()   → { type: 'string', control: 'select' }
number()   → { type: 'number', control: 'number' }
```

This eliminates the duplication problem — developers can use `defineEditable()` and the compiler auto-generates both the block attributes AND the sidebar controls.

---

### 2.4 — Developer API after Phase 2

A developer writes this — no WordPress concepts, no duplication:

```tsx
import { defineBlock, defineEditable, text, image, color, url, boolean } from '@forgewp/react';

// Schema: single source of truth
export const editable = defineEditable({
  heading:   text({ label: 'Heading', default: 'Welcome' }),
  heroImage: image({ label: 'Hero Image' }),
  bgColor:   color({ label: 'Background', default: '#1a1a2e' }),
  ctaUrl:    url({ label: 'CTA Link' }),
  showBadge: boolean({ label: 'Show Badge', default: true }),
});

export default defineBlock({
  name: 'hero',
  title: 'Hero Section',
  icon: 'cover-image',
  // No `attributes:` needed — compiler reads from defineEditable above
  edit: (props) => <HeroSection {...props.attributes} />,
  save: () => <HeroSection />
});
```

The compiler:
1. Reads `defineEditable` → generates `block.json` attributes
2. Reads `control` type → generates the correct sidebar controls
3. Reads `save()` JSX → generates `render.php`

**Zero WordPress code written by the developer.**

---

### 2.5 — Verification

**Test checklist:**
- [ ] A block using only `defineEditable()` (no manual `attributes:`) compiles correctly
- [ ] `block.json` contains proper attribute types (without `control`/`label` metadata)
- [ ] Sidebar controls match the schema types
- [ ] Existing blocks that use manual `attributes:` still work (backwards compatible)

---

## Phase 3 — Render-Side Binding (The Hard Problem)

**Goal:** When a client changes a property in the sidebar, the frontend renders it correctly — colors bind to styles, images bind to `src`, toggles control conditional rendering.

**This is the most complex phase.** The compiler needs to understand how each attribute type connects to the DOM.

---

### 3.1 — The Problem

Today, [block-compiler.js:L865-L871](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js#L865-L871) treats every `{attributes.x}` as text interpolation:

```js
// {title} or {props.title}
phpMarkup = phpMarkup.replace(
  /\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\s*\}/g,
  (match, varName) => {
    return `<?php echo esc_html( $attributes['${varName}'] ?? '' ); ?>`;
  }
);
```

This works for text. It doesn't work for:

| Attribute Type | JSX Usage | Required PHP Output |
|---|---|---|
| **color** | `style={{ backgroundColor: bgColor }}` | `style="background-color: <?php echo esc_attr($attributes['bgColor']); ?>"` |
| **image** (object) | `src={heroImage.url}` | `src="<?php echo esc_url($attributes['heroImage']['url'] ?? ''); ?>"` |
| **boolean** | `{showBadge && (<Badge />)}` | `<?php if ($attributes['showBadge']): ?><div>…</div><?php endif; ?>` |
| **url** | `href={ctaUrl}` | `href="<?php echo esc_url($attributes['ctaUrl'] ?? ''); ?>"` |

---

### 3.2 — Transpile inline style objects

**File:** [block-compiler.js](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js) — add new transpilation pass

Add a regex pass that converts React-style `style={{ ... }}` objects to PHP-interpolated HTML `style=""` attributes:

```js
// style={{ backgroundColor: attributes.bgColor, color: attributes.textColor }}
// →
// style="background-color: <?php echo esc_attr($attributes['bgColor'] ?? ''); ?>;
//        color: <?php echo esc_attr($attributes['textColor'] ?? ''); ?>;"
phpMarkup = phpMarkup.replace(
  /style=\{\{([^}]*)\}\}/g,
  (match, styleBody) => {
    const pairs = styleBody.split(',').map(pair => {
      const [prop, val] = pair.split(':').map(s => s.trim());
      if (!prop || !val) return null;

      // camelCase → kebab-case
      const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();

      // Check if value references an attribute
      const attrMatch = val.match(/(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)/);
      if (attrMatch) {
        return `${cssProp}: <?php echo esc_attr($attributes['${attrMatch[1]}'] ?? ''); ?>`;
      }
      // Static value
      return `${cssProp}: ${val.replace(/['"]/g, '')}`;
    }).filter(Boolean);

    return `style="${pairs.join('; ')}"`;
  }
);
```

**Insert this pass BEFORE the generic `{attributes.x}` catch-all** (before line 865).

---

### 3.3 — Transpile object property access for images

Images stored as `{ id, url, alt }` objects need nested property access:

```js
// src={heroImage.url} or src={attributes.heroImage.url}
// →
// src="<?php echo esc_url($attributes['heroImage']['url'] ?? ''); ?>"
phpMarkup = phpMarkup.replace(
  /(src|href)=\{\s*(?:attributes\.|props\.)?([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\}/gi,
  (match, attr, varName, prop) => {
    const escFunc = attr === 'href' || attr === 'src' ? 'esc_url' : 'esc_attr';
    return `${attr}="<?php echo ${escFunc}($attributes['${varName}']['${prop}'] ?? ''); ?>"`;
  }
);
```

**Insert this BEFORE the existing `src={image}` handler** at line 855.

---

### 3.4 — Conditional rendering already works (mostly)

The existing `transpileConditionals()` function at [block-compiler.js:L1198-L1204](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js#L1198-L1204) already handles:

```tsx
{showBadge && (<Badge />)}
```
→
```php
<?php if ($attributes['showBadge'] ?? null): ?>
  <div>…</div>
<?php endif; ?>
```

This should work for boolean toggles out of the box. Just verify it handles block attribute references.

---

### 3.5 — Verification

**Test cases to validate each binding type:**

```tsx
// In a block's save() function:
<section style={{ backgroundColor: attributes.bgColor }}>
  <img src={attributes.heroImage.url} alt={attributes.heroImage.alt} />
  <h1>{attributes.heading}</h1>
  {attributes.showBadge && (
    <span className="badge">New</span>
  )}
  <a href={attributes.ctaUrl}>Learn More</a>
</section>
```

**Expected `render.php` output:**
```php
<section style="background-color: <?php echo esc_attr($attributes['bgColor'] ?? ''); ?>">
  <img src="<?php echo esc_url($attributes['heroImage']['url'] ?? ''); ?>"
       alt="<?php echo esc_attr($attributes['heroImage']['alt'] ?? ''); ?>" />
  <h1><?php echo esc_html($attributes['heading'] ?? ''); ?></h1>
  <?php if ($attributes['showBadge'] ?? null): ?>
    <span class="badge">New</span>
  <?php endif; ?>
  <a href="<?php echo esc_url($attributes['ctaUrl'] ?? ''); ?>">Learn More</a>
</section>
```

**Test checklist:**
- [ ] Color attributes bind to inline styles correctly
- [ ] Image object attributes resolve nested properties (`url`, `alt`)
- [ ] Boolean attributes control conditional rendering
- [ ] URL attributes bind to `href` with `esc_url`
- [ ] Text attributes render with `esc_html`
- [ ] All five control types round-trip: editor change → save → frontend render

---

## Phase Summary

| Phase | What Ships | Files Changed | Breaking Changes | Risk |
|---|---|---|---|---|
| **Phase 1** | Clients can edit all property types in sidebar | `generate-theme.js`, `block-compiler.js` | None | Low |
| **Phase 2** | Developers use `editable.color()` instead of config objects | `hooks.ts`, `index.ts`, `block-compiler.js` | None (additive) | Low |
| **Phase 3** | PHP renders colors/images/toggles correctly | `block-compiler.js` | None | Medium |

---

## File Reference Map

| File | What It Does | Phases |
|---|---|---|
| [generate-theme.js](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/generate-theme.js) | Generates `forgewp-editor.js` — the Gutenberg editor script with sidebar controls | Phase 1 |
| [block-compiler.js](file:///c:/Users/hp/Desktop/ForgeWP/packages/compiler/lib/block-compiler.js) | Compiles block JSX → `block.json` + `render.php`. Handles PHP transpilation. | Phase 1, 2, 3 |
| [hooks.ts](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/hooks.ts) | Defines the developer-facing schema types and factory functions | Phase 2 |
| [index.ts](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/index.ts) | Public API surface — controls what `@forgewp/react` exports | Phase 2 |
| [WpEditable.tsx](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/components/WpEditable.tsx) | Inline text editing component (already works) | — |
| [WpImage.tsx](file:///c:/Users/hp/Desktop/ForgeWP/packages/react/src/components/WpImage.tsx) | Image component with WP media binding (already works) | — |

---

## What NOT to Build

To keep scope focused, these are explicitly out of scope:

- ❌ **Dragging inside blocks** — blocks are immutable compositions
- ❌ **Multi-CMS adapters** (Shopify, Payload) — future concern, not now
- ❌ **Custom visual block editor** — use Gutenberg's native preview
- ❌ **`<Editable.Color>` JSX components** — colors are sidebar controls, not DOM elements
- ❌ **Elementor compatibility** — ForgeWP generates native Gutenberg blocks

---

## Definition of Done

When all three phases are complete, this is the developer experience:

```tsx
import { defineBlock, defineEditable, text, image, color, url, boolean } from '@forgewp/react';

export const editable = defineEditable({
  heading:   text({ label: 'Heading', default: 'Welcome' }),
  subtitle:  richText({ label: 'Subtitle' }),
  heroImage: image({ label: 'Hero Image' }),
  bgColor:   color({ label: 'Background', default: '#0f172a' }),
  ctaUrl:    url({ label: 'CTA Link' }),
  showBadge: boolean({ label: 'Show Badge', default: true }),
});

export default defineBlock({
  name: 'hero',
  title: 'Hero Section',
  icon: 'cover-image',
  edit: (props) => <HeroSection {...props.attributes} />,
  save: () => <HeroSection />
});
```

And this is the client experience:

```
WordPress Admin → Edit Page → Click "Hero Section" block

Sidebar shows:
┌─────────────────────┐
│ Block Settings       │
├─────────────────────┤
│ Heading              │
│ [Welcome           ] │
│                      │
│ Subtitle             │
│ [Rich text editor  ] │
│                      │
│ Hero Image           │
│ [📷 Select Image   ] │
│                      │
│ Background           │
│ [🎨 Color Picker   ] │
│                      │
│ CTA Link             │
│ [https://          ] │
│                      │
│ Show Badge           │
│ [🔘 Toggle         ] │
└─────────────────────┘
```

The developer writes zero WordPress code.
The client edits properties, not layout.
The design stays pixel-perfect.