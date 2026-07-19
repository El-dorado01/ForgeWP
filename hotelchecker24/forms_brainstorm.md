# ForgeWP Forms — Architecture Brainstorm

> **⚠️ SUPERSEDED (July 2026).** The decision landed differently from every approach below: **no form-component vocabulary at all**. Forms stay plain React (islands); the framework adds only `submitWpForm()`, `<WpFormFields>` (client-owned fields slot), and a `forms` key in `wp.config.ts`. See **`../../forgewp_forms_spec.md`** (implementation spec) and `../../architectural-principles.md` Principle 11 + Decided Direction #4. This file is kept for historical context only.

## The Problem

The current contact form implementation has several issues that expose a deeper architectural gap in ForgeWP:

### What's wrong today

1. **CF7-coupled CSS** — [globals.css](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/globals.css#L512-L662) has ~150 lines of `.wpcf7-*` selectors. If the client switches to WPForms, Gravity Forms, or Fluent Forms, all of this breaks.

2. **Shortcode = black box** — `<WpShortcode code="[contact-form-7 ...]" />` renders whatever markup the plugin decides. The developer has zero control over the HTML structure, field order, or individual field styling.

3. **No design-time preview** — In dev mode, `WpShortcode` shows a grey dashed box saying "WordPress Shortcode Preview". The developer is designing blind.

4. **Hardcoded form ID** — The form ID (`58`, `e6d229e`) is baked in. Different WP installations have different IDs. Translations have different form IDs.

5. **CMS editability is limited** — The client can only swap the entire shortcode string. They can't add a field, rename a label, or toggle a field's required state.

---

## Core Tension

There are two fundamentally different things a developer might want:

| | **Hardcoded Form** | **Dynamic Form** |
|---|---|---|
| **Fields** | Dev decides at build time | Client configures in CMS |
| **Styling** | Dev controls every pixel | Framework provides base, dev overrides |
| **Submission backend** | Needs *some* WP plugin or handler | Same |
| **Preview in dev** | Full fidelity — it's just JSX | Placeholder or mock |
| **Example** | "I want exactly: name, email, subject dropdown, message" | "Render whatever form the client set up in CF7/WPForms" |

ForgeWP should support **both**, and the framework should make the boundary clear.

---

## Proposed Approaches

### Approach A — Framework Form Primitives

ForgeWP provides typed form-field components. The developer writes their form in JSX with full styling control. The **compiler** handles the WordPress backend wiring.

#### What the developer writes:

```tsx
import { WpForm, WpTextField, WpEmailField, WpTextarea, WpSelect, WpSubmit } from '@forgewp/react';

function ContactForm() {
  return (
    <WpForm name="contact" mailTo="admin" successMessage="Thank you!">
      <div className="grid grid-cols-2 gap-4">
        <WpTextField name="name" label="Name" required 
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm" />
        <WpEmailField name="email" label="Email" required
          className="border border-slate-200 rounded-xl px-4 py-3 text-sm" />
      </div>
      <WpSelect name="subject" label="Subject" 
        options={['General Inquiry', 'Hotel Inquiry', 'Partnership']}
        className="..." />
      <WpTextarea name="message" label="Message" rows={5} required
        className="..." />
      <WpSubmit className="bg-primary text-white font-bold ...">
        Send Message
      </WpSubmit>
    </WpForm>
  );
}
```

#### What the compiler generates:

**In dev mode** — renders as real `<form>`, `<input>`, `<textarea>` HTML elements with the developer's exact classes. Full visual fidelity.

**In WordPress (render.php)** — two possible strategies:

- **Strategy A1: Native HTML + REST endpoint** — The compiler emits a standard HTML `<form>` and registers a ForgeWP REST route that handles submission (sends email via `wp_mail`, stores in DB, etc.). No form plugin needed at all.

- **Strategy A2: Plugin adapter** — The compiler generates the configured plugin's shortcode/markup behind the scenes, but wraps each field in the developer's styled container. A `wp.config.ts` setting picks the adapter:

```ts
// wp.config.ts
export default defineConfig({
  forms: {
    adapter: 'cf7',       // or 'wpforms' | 'gravity' | 'native'
    notifications: 'admin' // default mail recipient
  }
});
```

#### Available field primitives:

| Component | HTML | Props |
|---|---|---|
| `<WpForm>` | `<form>` | `name`, `mailTo`, `successMessage`, `errorMessage`, `className` |
| `<WpTextField>` | `<input type="text">` | `name`, `label`, `placeholder`, `required`, `className` |
| `<WpEmailField>` | `<input type="email">` | same |
| `<WpPhoneField>` | `<input type="tel">` | same |
| `<WpNumberField>` | `<input type="number">` | `min`, `max`, `step`, + same |
| `<WpTextarea>` | `<textarea>` | `rows`, + same |
| `<WpSelect>` | `<select>` | `options`, `multiple`, + same |
| `<WpCheckbox>` | `<input type="checkbox">` | `checked`, + same |
| `<WpRadio>` | radio group | `options`, + same |
| `<WpFileField>` | `<input type="file">` | `accept`, `maxSize`, + same |
| `<WpHidden>` | `<input type="hidden">` | `value` |
| `<WpSubmit>` | `<button type="submit">` | `children`, `className` |

#### Pros
- Developer has **complete control** over markup and styling
- Works in dev mode with full fidelity — it's just HTML
- **Plugin-agnostic** — the adapter layer abstracts the backend
- Form IDs are irrelevant — the framework manages them
- Fields are typed, lintable, and auto-completed

#### Cons
- Significant framework work (compiler transpilation for each field type + REST handler + plugin adapters)
- Need to handle validation, CSRF, file uploads, AJAX submission, success/error states
- If using native mode (no plugin), we're essentially building a form plugin ourselves

---

### Approach B — Styled Shortcode Container (lighter touch)

Keep the shortcode approach but make it smarter. The framework provides a `<WpFormContainer>` that wraps any form plugin's output in a styling scope.

```tsx
<WpFormContainer 
  theme="premium-rounded"     // or a custom className
  labelStyle="mono-uppercase"
  formId="contact"             // logical name, not numeric ID
>
  <WpShortcode code={shortcode} />
</WpFormContainer>
```

The framework ships default form styling themes (not tied to `.wpcf7-*` selectors) that target **generic** selectors:

```css
/* Framework-provided: packages/ui/form-themes/premium-rounded.css */
.forgewp-form input[type="text"],
.forgewp-form input[type="email"],
.forgewp-form textarea,
.forgewp-form select { ... }

.forgewp-form label { ... }
.forgewp-form button[type="submit"] { ... }
```

And then a small runtime script normalizes any form plugin's output classes to the generic `.forgewp-form` scope.

#### Pros
- Much less compiler work
- Works with any form plugin out of the box
- Developer can still override styles

#### Cons
- Developer still can't control field order, layout, or individual field markup
- Plugin markup is still a black box
- No dev-mode preview (still the grey placeholder)
- The "normalizer" script is fragile — every plugin has different class structures

---

### Approach C — Dual-Mode System (recommended)

Combine the best of A and B:

#### Mode 1: `<WpForm>` Primitives (developer-controlled)

The developer writes form fields explicitly. Full control. Full dev preview. The compiler handles the backend.

```tsx
<WpForm name="contact" mailTo="admin">
  <WpTextField name="name" label={__('Name')} required className="..." />
  <WpEmailField name="email" label={__('Email')} required className="..." />
  <WpTextarea name="message" label={__('Message')} required className="..." />
  <WpSubmit className="...">
    {__('Send Message')}
  </WpSubmit>
</WpForm>
```

- Compiler transpiles to HTML + registers a `forgewp/v1/forms/{name}/submit` REST endpoint
- No form plugin dependency needed
- The REST endpoint uses `wp_mail()` for email, can optionally store submissions in a CPT

#### Mode 2: `<WpFormEmbed>` (plugin-managed, CMS-editable)

The developer says "render whatever form the client configured" and provides a styling scope. Good for clients who want to manage their own forms in CF7/WPForms.

```tsx
<WpFormEmbed 
  source="shortcode"          // how to resolve the form
  editable="form_shortcode"   // ACF meta key for CMS editability
  default='[contact-form-7 id="58" title="Contact Form"]'
  styleScope="premium"        // optional: apply framework form styles
  className="bg-white rounded-2xl p-8"
/>
```

- Compiler transpiles `WpFormEmbed` to `<?php echo do_shortcode(...); ?>` wrapped in a style scope
- The shortcode value comes from ACF metadata (editable by client)
- Developer can provide a `className` wrapper

#### How the CMS editability works (Mode 1):

The most interesting case — what if a client wants to add/remove fields from a developer-built form?

The `<WpForm>` accepts an optional `editable` prop that makes individual fields CMS-togglable:

```tsx
<WpForm name="contact" mailTo="admin" editable>
  <WpTextField name="name" label="Name" required />
  <WpEmailField name="email" label="Email" required />
  <WpSelect name="subject" label="Subject" options={subjects} />
  <WpTextarea name="message" label="Message" required />
  <WpSubmit>Send</WpSubmit>
</WpForm>
```

When `editable` is set:
- The compiler auto-generates an ACF field group for the form
- Each field gets a toggle (visible/hidden), label override, and required override
- Client can reorder fields in the CMS but cannot break the developer's styling
- Think of it like the existing `WpEditable` pattern but for form fields

---

## Trade-off Summary

| Criteria | A (Primitives only) | B (Styled shortcode) | C (Dual-mode) |
|---|---|---|---|
| Developer styling control | ✅ Full | ❌ Override only | ✅ Full (Mode 1) |
| Dev-mode preview | ✅ Full fidelity | ❌ Placeholder | ✅ Mode 1 only |
| Plugin independence | ✅ Yes | ❌ No | ✅ Mode 1 / ❌ Mode 2 |
| CMS field editability | ⚠️ With extra work | ❌ No | ✅ Both modes |
| Implementation effort | 🔴 High | 🟢 Low | 🟡 Medium-High |
| Works with existing CF7 forms | ❌ Must rebuild | ✅ Yes | ✅ Mode 2 |
| Framework value | Very high | Low | Very high |

---

## Open Questions

1. **Submission backend** — Should `<WpForm>` mode handle submissions natively (via a ForgeWP REST endpoint + `wp_mail()`), or should it always delegate to a form plugin? Native is cleaner but means ForgeWP needs to handle spam protection (reCAPTCHA/Akismet), file uploads, and email deliverability.

2. **Scope** — Should we build this for all form types (multi-step, payment, file upload), or start with a focused "contact/inquiry form" primitive and expand later?

3. **Migration path** — For hotelchecker24 right now, we could:
   - **Quick fix**: Get the current `WpShortcode` approach working (fix the render.php issue)
   - **Medium term**: Build the `<WpForm>` primitives for Mode 1
   - **Long term**: Full dual-mode with CMS editability

4. **Styling approach** — Should the framework ship default form styles (that look premium out of the box), or should each field component be completely unstyled (like Headless UI/Radix)?

5. **Priority** — Do we do a quick fix for the current form rendering issue first and brainstorm this architecture for a future sprint, or do we build this now?
