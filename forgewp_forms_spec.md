# ForgeWP Native Forms — Implementation Spec

**Status:** Approved for implementation — July 2026
**Supersedes:** `hotelchecker24/forms_brainstorm.md` (exploration doc; kept for history)
**Governing principles:** `architectural-principles.md` → Principle 11 ("Capabilities as Compiler Intelligence, Not Component Vocabulary") and Decided Direction #4 ("Native Form Infrastructure with a Field-Ownership Split")

This document is written to be implemented as-is, phase by phase, without needing the original discussion. Every referenced file exists today; extension points are named with paths.

---

## 1. Decision summary

Forms in ForgeWP are **plain React**. The framework does NOT ship form components (`<WpForm>`, `<WpTextField>`, …) and does NOT build adapters that puppet CF7/WPForms/Gravity. The hydration island system already gives devs full-fidelity forms with any library (react-hook-form, shadcn, sonner, plain `useState`).

The framework adds exactly three things:

| Addition | Kind | Purpose |
|---|---|---|
| `forms` key in `wp.config.ts` | config | Declares each form: dev-owned fields, delivery, client-field settings. Source of truth for the generated backend. |
| `submitWpForm(name, data)` | one runtime **function** (not a hook) | POSTs to the generated REST endpoint. Composes with any form library. |
| `<WpFormFields form render>` | one component | Renders **client-owned** fields (defined by the site editor in wp-admin) inside dev-supplied markup via a render prop. Only needed when a form opts into client-managed fields. |

**Field ownership is explicit and exclusive.** Every field is either:
- **dev-owned** — plain JSX in the dev's component; guaranteed present and stable; the backend may rely on it (e.g. `email` for Reply-To). The client cannot alter it.
- **client-owned** — defined in wp-admin (add/drop/reorder/relabel/require-toggle/options-edit), rendered through the `<WpFormFields>` slot so it always appears in dev-styled markup.

A form may be 100% dev-owned, 100% client-owned, or mixed. `<WpShortcode>` remains the untouched escape hatch for clients who insist on managing forms in a plugin — and is now a first-class per-form config choice: `forms.{name}.mode: 'shortcode'` (§2.1.1) tells the compiler to generate nothing at all for that form, mixed freely with `'native'` forms in the same theme.

### Non-goals (v1)
- No file uploads, no multi-step, no payment fields.
- No reCAPTCHA/Turnstile (v2 opt-in; v1 ships honeypot + time-trap + rate-limit).
- No PHP-side SSR of client-owned fields (v1 renders them in the island; v2 note in §10).
- ~~No per-language client-field sets~~ — **added post-v1** (July 2026): client-owned field labels/options are runtime wp-admin content, not compiled strings, so they can't go through `__()`/translations.json. For a theme with `i18n.locales.length > 1`, `clientFields.seed` accepts a per-locale map (`{ en: [...], de: [...] }`, or a flat array to seed every locale with the same content); storage becomes a locale-keyed option (`forgewp_form_fields_{name}` = `{ en: [...], de: [...] }`) instead of a flat list. `forgewp_forms_resolve_lang()` mirrors the existing menu/translation `$current_lang` resolution order (explicit param → Polylang/WPML → site locale). The admin "Forms" page gets a language-tab switcher per form; `submitWpForm` sends the visitor's page language (`window.forgeWpTranslations.currentLanguage`) so submissions validate against the field set the visitor actually saw. Pre-existing flat-list data (saved before a form went multilingual) is detected and returned as-is for every locale until the client explicitly saves a specific language tab, at which point storage splits into the per-locale map. Also added: `ForgeWPFormField.placeholder`, threaded through dev-owned fields (wrapped in `__()` like `label`), client-owned field seeds, the admin editor (new column), and `WpFormFieldDescriptor`.

---

## 2. Config schema (`wp.config.ts`)

### 2.1 Types — add to `packages/compiler/lib/index.d.ts` (`ForgeWPThemeConfig`)

```ts
export type ForgeWPFormFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';

export interface ForgeWPFormField {
  type: ForgeWPFormFieldType;
  label?: string;          // used in email output and admin UI; defaults to Title Case of name
  required?: boolean;
  options?: string[];      // select only
  maxLength?: number;      // server-side cap; defaults: 200 (inputs), 5000 (textarea)
}

export interface ForgeWPFormClientFieldsConfig {
  enabled: boolean;
  /** Initial client-owned field set. Seeds the wp-admin editor on first install
   *  AND is what <WpFormFields> renders in local dev. `name` slugs must not
   *  collide with dev-owned field names (compiler diagnostic — see §7). */
  seed: Array<ForgeWPFormField & { name: string }>;
}

export interface ForgeWPFormConfig {
  /** Defaults to 'native'. See §2.1.1 for 'shortcode' mode. */
  mode?: 'native' | 'shortcode';
  /** Default/example shortcode string, used only in 'shortcode' mode. */
  shortcode?: string;
  /** 'admin' → get_option('admin_email'); or a literal email;
   *  or 'option:some_key' → get_option('some_key') (site-options integration).
   *  Required in 'native' mode. */
  mailTo?: string;
  /** Email subject line. Supports {field} interpolation from submitted values. */
  subject?: string;
  /** Dev-owned fields — the fixed part of the server-side allowlist. */
  fields?: Record<string, ForgeWPFormField>;
  clientFields?: ForgeWPFormClientFieldsConfig;
  /** Store each submission in the forgewp_submission CPT (client inbox). Default true. */
  storeSubmissions?: boolean;
}

// on ForgeWPThemeConfig:
forms?: Record<string, ForgeWPFormConfig>;
```

`mode` defaults to `'native'`. In `'native'` mode, `mailTo` and `fields` are required. In `'shortcode'` mode, `shortcode` is required and `mailTo`/`fields`/`clientFields`/`storeSubmissions` are ignored — see §2.1.1.

### 2.1.1 Shortcode mode — the plugin escape hatch

```ts
forms: {
  newsletter: {
    mode: 'shortcode',
    shortcode: '[wpforms id="12" title="Newsletter Signup"]',
  },
},
```

A `mode: 'shortcode'` form is invisible to `buildFormsPhp` — no REST endpoint, no CPT entry, no admin "Forms" section, no hydration payload entry. The developer renders it with the existing `<WpShortcode>` primitive directly:

```tsx
import { WpShortcode, useWpMeta } from '../.forgewp/wordpress';

<WpShortcode code={useWpMeta('newsletter_shortcode', '[wpforms id="12" title="Newsletter Signup"]')} />
```

Using `useWpMeta` (with a `pickEditable`-mapped meta key) rather than a bare string literal makes the shortcode itself client-editable in wp-admin, matching the original brainstorm's Mode 2. This costs zero new runtime API — `useWpMeta`/`pickEditable`/`WpShortcode` already exist for exactly this. `forms.{name}.shortcode` in config is a **default/documentation value only**; it is not read at runtime — the dev's own `useWpMeta(...)` default is the actual live default. `lintFormsUsage` (§7) warns if a shortcode-mode form has no matching `<WpShortcode>` usage anywhere in `src/`, and if `submitWpForm`/`<WpFormFields>` are mistakenly used against one.

Mixed configs are fully supported — some forms `native`, others `shortcode`, in the same theme.

### 2.2 Example (hotelchecker24's contact form)

```ts
// wp.config.ts
forms: {
  contact: {
    mailTo: 'admin',
    subject: 'Neue Kontaktanfrage — {subject}',
    fields: {
      name:  { type: 'text',  label: 'Ihr Name', required: true },
      email: { type: 'email', label: 'E-Mail-Adresse', required: true },
    },
    clientFields: {
      enabled: true,
      seed: [
        { name: 'subject', label: 'Betreff', type: 'select', required: true,
          options: ['Hotelanfrage / Empfehlung', 'Kooperationsanfrage',
                    'Redaktionelle Anfrage', 'Technischer Support', 'Sonstiges'] },
        { name: 'message', label: 'Ihre Nachricht', type: 'textarea', required: true },
      ],
    },
    storeSubmissions: true,
  },
},
```

Form names must match `/^[a-z][a-z0-9-]*$/` (they become REST route segments and option-name suffixes).

---

## 3. Runtime API (`packages/react`)

Both exports are added to `packages/react/src/index.ts` AND to the per-theme shim template `packages/compiler/templates/wordpress.tsx` (themes import from `../.forgewp/wordpress`).

### 3.1 `submitWpForm(name, data)` — in `packages/react/src/hooks.ts` (or a new `forms.ts` re-exported from there)

```ts
export interface WpFormResult {
  ok: boolean;
  /** Human-readable server message (already translated server-side). */
  message?: string;
  /** Per-field validation errors keyed by field name. */
  errors?: Record<string, string>;
}

export async function submitWpForm(
  name: string,
  data: FormData | Record<string, unknown>,
): Promise<WpFormResult>;
```

Behavior:
- **Production detection** mirrors `useWpOption` (see `getForgeWpSiteSettings()` at `packages/react/src/hooks.ts:180`): production iff `window.forgeWpHydration?.restUrl` exists.
- **Production:** `fetch(`${restUrl}/forms/${name}/submit`, { method: 'POST', body })`.
  - Accepts `FormData` directly (recommended pattern — client-added fields flow through with zero dev code) or a plain object (JSON body, `Content-Type: application/json`).
  - Adds header `X-WP-Nonce: window.forgeWpHydration.restNonce` **when present** (see §4.4 for why it is not required).
  - Adds `_forgewp_elapsed`: milliseconds since module evaluation (module-scope `const loadedAt = Date.now()`), for the server time-trap.
  - Never throws on HTTP errors — always resolves to a `WpFormResult` (`ok:false` with `message`/`errors`). Throws only on network failure? **No** — catch and return `{ ok:false, message:'network' }` so dev UIs never need try/catch.
- **Dev simulation:** log the payload with a `[forgewp:forms]` prefix, `await` ~500 ms, return `{ ok: true, message: 'Simulated (dev)' }`. If the payload contains a value `"__fail__"` in any field, return `{ ok:false, errors:{...} }` — lets devs preview their error UI.

**Honeypot convention (no new API):** if the dev includes `<input name="_forgewp_hp" className="hidden" tabIndex={-1} autoComplete="off" />` in their form, the server rejects any submission where it is non-empty. Documented convention, plain HTML, optional. `<WpFormFields>` renders it automatically (§3.2), so mixed/client forms get it for free.

### 3.2 `<WpFormFields>` — new file `packages/react/src/components/WpFormFields.tsx`

```ts
export interface WpFormFieldDescriptor {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface WpFormFieldsProps {
  form: string;
  render: (field: WpFormFieldDescriptor) => React.ReactNode;
}
```

Behavior:
- **Field source, dev:** `window._forgeWpMockForms?.[form]?.fields` — injected by the compiler's Vite dev plugin from `wp.config.ts` (`clientFields.seed`), the same mechanism that provides `window._forgeWpMockSiteSettings` today. Fallback: render nothing + one console warning.
- **Field source, production:** `window.forgeWpHydration.forms[form].fields` (localized server-side from the stored option — §4.5).
- **Hydration-mismatch guard (required):** the compile-time SSR pass bakes the *seed* fields into static HTML, but the live option may differ. To avoid React hydration mismatches, use the standard two-pass pattern: first client render returns the seed (matching SSR), then after mount (`useEffect`) re-render from `forgeWpHydration.forms`. Brief content swap is acceptable in v1; eliminated in v2 (§10).
- Renders `render(field)` for each field **in the stored order**, wrapped in a `<React.Fragment key={field.name}>`.
- Automatically appends the honeypot input (`_forgewp_hp`, visually hidden inline style, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`).
- Contains no markup of its own besides the honeypot — Principle 8 (dev owns 100% of visible HTML).

`WpFormFields` uses `useState`/`useEffect`, so `is-interactive.js` island detection picks up any component containing it automatically — no `<Hydrate>` bookkeeping needed by the dev (their form already has `onSubmit` anyway).

---

## 4. Generated PHP (`packages/compiler`)

New builder: **`packages/compiler/lib/functions/forms.js`** exporting `buildFormsPhp(config)`. Wire into `buildFunctionsPhp` in `packages/compiler/lib/functions/index.js` exactly like `buildRestEndpointsPhp` (called at line ~936, emitted into the functions.php template at line ~978). Emits nothing when `config.forms` is absent/empty — starters and existing themes are byte-identical (integrity harness stays green).

All PHP below is per-form, generated from config. Namespace/route style matches `rest-endpoints.js` (`forgewp/v1`).

### 4.1 Endpoint

```php
add_action('rest_api_init', function () {
    register_rest_route('forgewp/v1', '/forms/contact/submit', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_handle_form_contact',
        'permission_callback' => '__return_true', // anonymous by design; defenses below
    ));
});
```

### 4.2 Handler — validation pipeline (in order)

1. **Rate limit:** transient `forgewp_form_rl_' . md5($ip)` — max 5 submissions / 10 min per IP → `429` with translated message. Use `$_SERVER['REMOTE_ADDR']` only (do not trust XFF).
2. **Logged-in nonce:** if `is_user_logged_in()`, require valid `X-WP-Nonce` (`wp_verify_nonce(..., 'wp_rest')`) → `403` on failure. Anonymous requests skip this (see §4.4).
3. **Honeypot:** `_forgewp_hp` present and non-empty → return `200 { ok: true }` (silent drop — never teach the bot).
4. **Time-trap:** `_forgewp_elapsed` missing or `< 3000` → silent drop as above.
5. **Build the allowlist:** dev-owned fields (baked from config as a PHP literal array with type/required/maxLength/options) **+** current client-owned fields from `get_option('forgewp_form_fields_contact')` (§4.3), decoded and validated in shape. **Only allowlisted keys are read from the request; everything else is ignored.**
6. **Validate + sanitize per type:**
   - required & empty → collect into `$errors[$name]`
   - `email` → `sanitize_email` + `is_email` check
   - `textarea` → `sanitize_textarea_field`, cap at `maxLength` (default 5000)
   - `select` → value must be in the field's `options` array (client fields: options from the stored option)
   - `checkbox` → coerce to `'1'`/`''`
   - everything else → `sanitize_text_field`, cap at `maxLength` (default 200)
   - **Header-injection guard:** strip `\r`/`\n` from every value before any use in mail headers or subject.
   - Any `$errors` → `400 { ok:false, errors, message }`.
7. **Store** (if `storeSubmissions`): `wp_insert_post` into `forgewp_submission` (post_title = form name + date; sanitized values as post meta `field_{name}`, plus `_form_name`, `_submitted_at`, `_ip_hash` = `md5` of IP — no raw IP at rest).
8. **Mail:** `wp_mail($to, $subject, $body, $headers)`
   - `$to` resolved from `mailTo` (`admin` → `get_option('admin_email')`; `option:key` → `get_option('key')`; else literal).
   - `$subject` = config subject with `{field}` interpolation (post-sanitization values).
   - `$body` = plain text, one `Label: value` line per field in order.
   - `$headers` = `Reply-To: {email field value}` when the form has an `email`-type dev-owned field.
   - Mail failure with storage ON → still `200 ok` (submission is safe in the CPT). Mail failure with storage OFF → `500 { ok:false }`.
9. Return `200 { ok: true, message: __('...', textDomain) }`.

All user-facing strings use `__('…', '${config.textDomain}')` and get added to the i18n key collection like other generated strings.

### 4.3 Client-fields storage + admin UI

- Option per form: `forgewp_form_fields_{name}` = JSON array of `{name,label,type,required,options}`. Registered/seeded on `after_switch_theme` from the config seed **only if the option does not exist** (never clobber client edits on redeploy).
- Admin UI: a **"Forms" submenu** added beside the generated Theme Options page — extend the pattern in `packages/compiler/lib/functions/settings-page.js` (`buildSettingsPagePhp`), including its nonce handling (`wp_create_nonce`, see settings-page.js:73). Per form: a table repeater (label, type select, required checkbox, options textarea for selects, remove button, drag-or-arrow reorder) driven by ~80 lines of inline vanilla JS that serializes to a hidden JSON input on submit. Server side: capability `manage_options`, nonce check, strict shape validation (types whitelist, `name` slugified from label on create and immutable after, collision check against dev-owned names) before `update_option`.
- New fields added by the client get auto-generated `name` slugs — clients never type machine names.

### 4.4 Why the endpoint is anonymous (no hard nonce requirement)

WP nonces live 12–24 h; on full-page-cached sites (very common for marketing/contact pages) a baked nonce goes stale and every visitor's submission would 403. CF7/WPForms accept anonymous posts for exactly this reason. An anonymous contact submission changes no auth-scoped state, so CSRF is not the threat model — spam is, and that is handled by honeypot + time-trap + rate-limit + strict allowlist. Nonce IS enforced when a WP user is logged in (their session exists, so the nonce is fresh via the localized payload).

### 4.5 Hydration payload additions — `packages/compiler/lib/functions/hydration-enqueuer.js`

Extend the `window.forgeWpHydration` inline script (built at hydration-enqueuer.js:70–72) with, when `config.forms` is non-empty:

```php
'restUrl'   => esc_url_raw( rest_url( 'forgewp/v1' ) ),
'restNonce' => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
'forms'     => forgewp_forms_hydration_payload(), // { contact: { fields: [...client fields from option...] } }
```

`forgewp_forms_hydration_payload()` is emitted by `forms.js`: reads each form's option, falls back to the baked seed, returns only client-owned field descriptors (never mailTo or other config).

### 4.6 CPT registration (once, if any form has `storeSubmissions`)

`forgewp_submission`: `public => false`, `show_ui => true`, `show_in_menu => true`, label "Form Submissions", `supports => ['title']`, `capabilities` mapped so it is read-only in the list (creation only via the endpoint; `'map_meta_cap' => true` with `create_posts => 'do_not_allow'`). Add a `meta_box` (or simple `the_content` filter on the edit screen) printing the `field_*` meta as a definition list — the "client inbox".

---

## 5. Dev-mode simulation (compiler Vite plugin)

Follow the `_forgeWpMockSiteSettings` mechanism (whichever plugin injects it — likely `packages/compiler/lib/page-config-plugin.js` or the dev-server entry): inject

```js
window._forgeWpMockForms = { contact: { fields: [ /* clientFields.seed */ ] } };
```

from `wp.config.ts` at dev-server start, hot-reloading on config change. This is what `<WpFormFields>` renders offline (Principle 7 — full simulation without WordPress) and what `submitWpForm` logs against.

---

## 6. Security checklist (verify each during implementation review)

- [ ] Only allowlisted field names read from the request (dev-owned config + stored client fields); unknown keys ignored, never echoed.
- [ ] Every value sanitized by declared type before storage/mail; length caps enforced.
- [ ] `\r`/`\n` stripped from all values used in subject/headers (header injection).
- [ ] Select values validated against the option list (no arbitrary values through selects).
- [ ] Rate limit per IP; honeypot + time-trap fail **silently** with `200 ok`.
- [ ] Nonce enforced for logged-in users; anonymous rationale documented (§4.4).
- [ ] No raw IP stored (hash only); no values ever printed unescaped in the admin inbox (`esc_html` on output).
- [ ] Admin field editor: `manage_options` + nonce + strict shape validation; field `name` immutable after creation.
- [ ] Endpoint responses never leak whether mail succeeded to a bot (silent-drop paths identical to success).

---

## 7. Compiler diagnostics (Principle 10)

Add to `forgewp analyze` / build-time validation:
- `forms.{name}` key invalid slug → error.
- `clientFields.seed` name colliding with a dev-owned field name → error.
- `mode: 'native'` (or default) missing `mailTo` or `fields` → error. `mode: 'shortcode'` missing `shortcode` → error.
- A theme source references `submitWpForm('x', …)` (string-literal first arg) where `x` is not declared in `config.forms` → warning with the declared names listed. Where `x` is declared but `mode: 'shortcode'` → warning (no endpoint exists for it).
- `<WpFormFields form="x">` for an `x` without `clientFields.enabled` → warning. Where `x` is `mode: 'shortcode'` → warning (no client-field concept in that mode).
- `mode: 'shortcode'` form with no matching `<WpShortcode>` usage anywhere in `src/` → warning (declared but never rendered).

---

## 8. hotelchecker24 migration (do after framework v1 lands)

1. `wp.config.ts`: add the `forms.contact` block exactly as §2.2.
2. `src/components/OldContactForm.tsx` → rename to `ContactForm.tsx` and edit:
   - Delete the CF7 `FormData` wiring and endpoint fetch (lines 61–74) → `const result = await submitWpForm('contact', new FormData(e.currentTarget));` then set status from `result.ok` / `result.message`.
   - Replace the hardcoded subject `<select>` (lines 166–186) and message `<textarea>` block (lines 188–201) with one `<WpFormFields form="contact" render={...} />` using the existing input classNames; keep name/email as-is (dev-owned).
   - Keep the URL-prefill effect; apply prefill via `defaultValue` inside the render prop keyed on `field.name === 'subject'` (switch those two fields from controlled to uncontrolled — FormData submission needs no controlled state).
   - Remove the hidden `{__('Anfrage zu Hotel:')}` div hack if the i18n scanner picks the string up from the effect; verify with the i18n key output before deleting.
3. `src/components/ContactFormSection.tsx`: drop `form_shortcode` meta, the shortcode `<input>`, `<WpShortcode>` usage, and the `ContactFormPrefill` import (review that component — likely obsolete); render `<ContactForm formTitle={…} formDescription={…} />`. Keep title/description editables and the block settings panel.
4. `cms/editables/kontakt-page.ts`: remove the `form_shortcode` field.
5. `src/app/globals.css`: delete the `.wpcf7-*` block (~lines 512–662).
6. Remove CF7 from any required-plugin docs/config for the theme.
7. Verify: `pnpm dev` shows the full form with seed fields; mock submit succeeds; error UI reachable via `__fail__`; `pnpm build`/theme export contains the endpoint, CPT, Forms admin page, and no `wpcf7` references.

---

## 9. Test plan

- **Compiler (Vitest harness):**
  - `buildFormsPhp` snapshot for a representative config (endpoint, handler, allowlist literal, CPT, admin page, hydration payload fn).
  - No `forms` config → zero output; full-theme generation byte-identical for `packages/starter` and `packages/html-starter` fixtures.
  - Diagnostics from §7 fire on crafted bad configs.
- **React package:** unit tests for `submitWpForm` dev simulation (resolves ok; `__fail__` path; never throws) and `WpFormFields` (renders seed order, honeypot appended, two-pass swap to `forgeWpHydration.forms`).
- **PHP handler logic** (if no PHP test rig exists, cover via generated-string assertions): required-empty → error key; select outside options → error; honeypot filled → ok-shaped response; header-injection strings stripped.
- **End-to-end:** hotelchecker24 `pnpm build` green; exported theme activated against a WP instance → submit → mail via `wp_mail` intercepted or submission visible in Form Submissions.

---

## 10. Phasing

**v1 (this spec):** everything above.

**v2 (explicitly deferred):**
- **PHP SSR of client fields** — transpile the `<WpFormFields>` render prop to a PHP `foreach` over the stored option so first paint matches live fields (removes the two-pass swap). The php-transpiler already inlines local components; this extends it to one render-prop pattern.
- reCAPTCHA/Turnstile as `forms.{name}.captcha` config.
- File-upload field type (needs mime/size policy + attachment handling).
- Per-language client-field sets under Polylang (v1: one shared set; labels are client-entered so multilingual sites should keep label-bearing fields dev-owned with `__()` until this lands).
- Submissions CSV export + bulk delete; retention policy setting.
- `<WpShortcode>` dev placeholder upgrade: render a generic mock form instead of the grey box.

---

## 11. Acceptance criteria

- [ ] A dev can build a working contact form using **only** plain JSX + `submitWpForm` + one config block — no new components learned.
- [ ] A client can add, drop, reorder, relabel, toggle-required, and edit select options for client-owned fields in wp-admin, and the live form + server allowlist + email reflect it with **zero theme code changes**.
- [ ] A client cannot touch dev-owned fields or break layout/styling.
- [ ] Dev mode previews the entire flow (fields, submit, success, error) offline.
- [ ] hotelchecker24 ships with CF7 fully removed and the harness + starters stay green.
- [ ] API surface added: exactly `submitWpForm`, `WpFormFields`, `forms` config key.
