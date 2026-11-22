# Scoped Design Spec: Plugin-Managed `<WpShortcode>` Local Preview & Optional Styling

**Status:** Proposed (scoping brief for review before implementation)  
**Tracks:** `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` — *"Improve the plugin-managed form experience"*  
**Non-negotiable invariant:** Preserves `mode: 'shortcode'` as an explicit escape hatch and keeps ForgeWP Native Forms (`submitWpForm` / `WpFormFields` / `cms/forms/*.ts`) 100% independent of third-party plugins.

---

## 1. Problem Statement

Today `<WpShortcode code="[contact-form-7 id=\"58\" title=\"Contact Form\"]" />` renders an accurate WordPress `do_shortcode(...)` call in production (`markup-processor.js`), but during local React/Next development (`WpShortcode.tsx`), it renders a single grey placeholder banner:

> WordPress Shortcode Preview: [contact-form-7 ...]

Additionally, developers styling plugin forms across different WordPress form plugins often resort to writing un-scoped plugin selector overrides (e.g. raw `.wpcf7-*` rules in `globals.css`) that break if a client switches plugins.

---

## 2. Supported Scope (v1 Plugins + Fallback)

Only these three WordPress form plugins receive dedicated structural recognition and optional scoped CSS presets in v1:

| Plugin | Recognized shortcode tag(s) | Root container selector(s) in WordPress |
|---|---|---|
| **Contact Form 7** | `[contact-form-7 ...]` | `.wpcf7`, `.wpcf7-form` |
| **WPForms** | `[wpforms ...]` | `.wpforms-container`, `.wpforms-form` |
| **Gravity Forms** | `[gravityform ...]` / `[gravityforms ...]` | `.gform_wrapper`, `.gform_wrapper form` |

Any other shortcode (`[events_list ...]`, Ninja Forms, Formidable, custom shortcodes) continues to use the neutral shortcode preview card (preserving full backward compatibility) without misidentifying the shortcode as a form.

---

## 3. Explicit Preview Fidelity Limits

Local Vite / Next.js dev servers do **not** run PHP or installed WordPress plugin databases. Therefore local preview fidelity MUST stay honest and predictable:

1. **No PHP/DB execution:** Live field definitions stored inside WordPress plugin post meta / tables are not queried unless explicitly connected to WordPress, and non-trivial plugin behaviors never simulate as real validation.
2. **Explicit mock badge:** Any rendered local preview displays a clear *"Local Shortcode Mockup — rendered by \<Plugin\> in WordPress"* header/caption and disables live REST submission (submitting shows an informational dev toast rather than pretending a plugin processed the submission).
3. **Never implies editing parity:** The ForgeWP `Forms` admin screen continues to omit `mode: 'shortcode'` forms; shortcode forms remain managed in the chosen WordPress plugin's own admin UI.
4. **Static form-ID fragility unchanged:** Hardcoded IDs like `id="58"` remain deployment-specific (matching existing `wp.config.ts` docs) unless resolved via `useWpOption()` / `useWpCustomField()`.

---

## 4. Proposed Additive Contracts (API & Config)

All additions below are **optional and additive** — existing `<WpShortcode code="..." />` and `forms.<name> = { mode: 'shortcode', shortcode: '...' }` behave identically by default.

### 4.1 Config preview descriptors (`ForgeWPFormConfig` when `mode: 'shortcode'`)

```ts
forms: {
  contact: {
    mode: 'shortcode',
    shortcode: '[contact-form-7 id="58" title="Contact Form"]',
    /** Optional dev-only preview fields so designers see layout/spacing locally. */
    previewFields: [
      { name: 'your-name', label: 'Name', type: 'text', required: true },
      { name: 'your-email', label: 'Email', type: 'email', required: true },
      { name: 'your-message', label: 'Message', type: 'textarea' },
    ],
    /** Optional submit label shown in local preview only. */
    previewSubmitLabel: 'Send Message',
  },
}
```

- `previewFields` and `previewSubmitLabel` are **dev-only** (`virtual:forgewp-runtime` / preview injection — zero bytes emitted into `functions.php` or WordPress REST endpoints).
- Developers can associate them with `<WpShortcode code="..." previewForm="contact" />` or `<WpShortcode code="..." previewFields={[...]} />`.
- When neither `previewFields` nor `previewForm` is supplied for a recognized CF7 / WPForms / Gravity shortcode, `<WpShortcode>` parses `id` / `title` from the shortcode attributes and renders an informative card showing detected plugin name, parsed title/ID, and a standard generic preview toggle (never breaking custom styling layouts).

### 4.2 Opt-in Scoped Styling (`styleScope` on `<WpShortcode>`)

```tsx
<WpShortcode
  code={shortcode}
  styleScope="clean" // 'none' (default) | 'clean' | 'minimal' | 'rounded'
  className="max-w-xl"
/>
```

- **Default (`styleScope="none"` / omitted):** Emits only the existing `<forgewp-shortcode code="..." />` marker (`<?php echo do_shortcode(...); ?>`) — byte-identical to today.
- **When `styleScope` is opted in:**
  - Production compiler wraps `<?php echo do_shortcode(...); ?>` inside `<div class="forgewp-shortcode-form forgewp-shortcode-scope--<scope> ...">...</div>` (preserving `className` if supplied).
  - Emits lightweight, low-specificity CSS scoped strictly to `.forgewp-shortcode-form.forgewp-shortcode-scope--<scope>` covering standard controls (`input`, `textarea`, `select`, `label`, `button[type="submit"]`, `[type="checkbox"]`, `[type="radio"]`) PLUS documented status selectors for the 3 supported plugins (`.wpcf7-response-output`, `.wpcf7-not-valid-tip`, `.wpforms-error`, `.wpforms-confirmation-container-full`, `.gfield_error`, `.gform_confirmation_message`).
  - Zero runtime JS "class normalizer" script (avoids fragile DOM mutation conflicts with AJAX plugin form submissions, Stripe Elements, or conditional logic scripts).
  - Local dev preview renders inside the exact same `.forgewp-shortcode-form.forgewp-shortcode-scope--<scope>` wrapper class so designers preview typography, spacing, borders, and button appearance accurately without guessing plugin markup.

---

## 5. Dual-Mode Portability Classification

Under ForgeWP's [Dual-Mode Portability Architecture](dual-mode-portability-architecture.md):

- **Portability Tier:** **Tier 3 — Native-Pinned** (compatible with **Native WordPress** mode and **Hybrid** route delegation; **incompatible** with standalone **Pure Decoupled** mode).
- **Why:** Third-party shortcode plugins (`contact-form-7`, `wpforms`, `gravityforms`, etc.) enqueue PHP-coupled JS/CSS, nonces, CAPTCHAs, and `admin-ajax.php` / plugin REST expectations that assume a WordPress page lifecycle. Calling `do_shortcode()` over REST strips that lifecycle and breaks live submissions.
- **Mode-Switch & Preflight Behavior (`forgewp doctor`):**
  - `forgewp doctor --target decoupled` MUST flag any page rendering `<WpShortcode>` or form configured with `mode: 'shortcode'` upfront (naming the affected file and route) rather than letting a developer push to Pure Decoupled and render a non-functional placeholder.
  - **Recommended migration path for 1-click Pure Decoupled portability:** Use ForgeWP Native Forms (`mode: 'native'`, `<WpFormFields>`, `submitWpForm`, `useWpForm`), which carry no third-party PHP/asset lock-in.
  - **Legacy escape hatches when a plugin form cannot be migrated:** On future ForgeWP Infra, assign the shortcode route to **Hybrid mode** (Edge delegates that route to the visually matching compiled Native WordPress theme) or opt explicitly into a same-origin iframe embed bridge (not enabled silently by default).

---

## 6. Non-Goals

- No runtime JS rewriting of plugin HTML or class names.
- No bidirectional sync or import/export between plugin DB schemas (CF7/WPForms/Gravity) and `cms/forms/*.ts`.
- No simulation of CAPTCHA, conditional logic, payment fields, multi-page wizards, or AJAX plugin REST endpoints in local dev.
- No generation of `wp-admin` editors or `forgewp/v1` endpoints for `mode: 'shortcode'`.

---

## 7. Acceptance Criteria (for Follow-Up Implementation PR)

1. Without `styleScope` / `previewFields` / `previewForm`, all existing `<WpShortcode>` SSR, markup-processor, and `functions.php` outputs remain byte-identical.
2. Shortcode attribute parser cleanly identifies `contact-form-7`, `wpforms`, and `gravityform`/`gravityforms` (extracting `id` / `title`) and keeps non-form shortcodes unaffected.
3. Opting into `styleScope` wraps `do_shortcode(...)` safely in production PHP (escaping `className` / `styleScope`), outputs scoped CSS only when used, and applies matching classes to the local dev mockup.
4. `forgewpVirtualPlugin` strips `mailTo`/server-only data and exposes only `previewFields` for `mode: 'shortcode'` forms during dev (`command === 'serve'`), emitting zero shortcode preview data in production builds.
5. `forgewp doctor --target decoupled` surfaces explicit Tier 3 portability diagnostics for `mode: 'shortcode'` forms and `<WpShortcode>` usages.
