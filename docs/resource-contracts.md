# ForgeWP Resource Contracts

**Status:** Draft — `site-settings` and `forms` proposed by Claude (2026-11-23), awaiting founder approval  
**Governs:** Phase A of [dual-mode-portability-architecture.md](dual-mode-portability-architecture.md) §9 and [parallel-workstreams.md](parallel-workstreams.md) §3

A resource is one piece of WordPress-backed data the frontend reads. Each resource has **one JSON shape**, served two ways:

| Mode | Source | Producer |
|---|---|---|
| Native WordPress | `window.forgeWpHydration.resources[<name>]`, written by PHP into the page | Claude (PHP emitters) |
| Decoupled / Hybrid | `GET /wp-json/forgewp/v1/<route>` | Claude (PHP emitters) |
| Local dev / tests | `cms/*` fixtures shaped exactly like the REST response | Gemini (`fixtureSource`) |

Gemini's `ForgeWpRuntime` (`nativeSource` / `restSource` / `fixtureSource`) and every hook or server-client method read only this shape. **Rule:** the native payload and the REST response for the same request must be byte-identical JSON (verified by the parity check in each entry).

## Shared conventions

- **Keys:** camelCase in JSON. Declared option, theme-mod and field names are keys the developer chose and are passed through unchanged.
- **Allowlist only:** endpoints expose only names declared in the project's `cms/` config. They never read arbitrary `get_option()` names from a request.
- **Errors:** the standard WordPress REST error object `{ "code": string, "message": string, "data": { "status": number } }`. Codes are prefixed `forgewp_`.
- **Language:** resources with translatable content accept `?lang=<code>`, resolved the same way native rendering resolves the current language (Polylang/WPML/ForgeWP locales). The response states the resolved `lang`.
- **Caching:** public GET responses send `Cache-Control: public, max-age=60, stale-while-revalidate=300` and an `X-ForgeWP-Cache-Tags` header listing the resource's tags. The Phase B revalidation webhooks purge by these tags.
- **Native embedding:** `forgeWpHydration.resources` is a map from resource name to response JSON. During the transition the legacy keys (`siteSettings`, `forms`) stay populated so existing hooks keep working until Gemini's runtime moves over. They are removed before the beta.
- **Versioning:** each response carries `"v": 1`. A breaking shape change bumps `v` and updates this file in the same PR.

---

## `siteSettings`

Values of the site-wide options and theme mods the project declares (`cms/site-options.*` via `defineWpOptions`, `cms/theme-mods.*`).

- **Route:** `GET /wp-json/forgewp/v1/site-settings`
- **Auth:** public
- **Params:** `lang` (optional; reserved for translated option values, ignored until a multilingual option store exists)
- **Cache tags:** `options`, `theme-mods`
- **Native key:** `forgeWpHydration.resources.siteSettings`

### Response

```json
{
  "v": 1,
  "options": {
    "contact_phone": "+1 (555) 019-9000",
    "contact_email": "admin@forgewp.local",
    "social_youtube": ""
  },
  "themeMods": {
    "custom_logo": "",
    "header_textcolor": "#0f172a",
    "footer_text": "© 2026 ForgeWP. All rights reserved."
  }
}
```

- Every declared option and theme mod is present. A value that was never saved returns its declared default, so the frontend never sees a missing key.
- Values are returned as stored: strings stay strings, and numbers and booleans keep their JSON types. `custom_logo` is the attachment ID as a string, or `""`. The logo URL comes from the existing `site-info` resource (`logoUrl`), which stays a separate resource.
- Options declared with `private: true` (proposed new flag on `defineWpOptions` entries) are omitted from both REST and native output. All other declared options are public, because they exist to be rendered on the site.

### Storage (Phase A breaking change, owned by the Companion Plugin from Phase B)

Theme mods are stored per theme in WordPress (`theme_mods_{stylesheet}`), and `nav_menu_locations` and `custom_logo` live there too. Switching or swapping the theme therefore loses them (see dual-mode doc §8.4). ForgeWP-declared theme mods, `custom_logo` and `nav_menu_locations` move to a single option, `forgewp_theme_state`:

- **Read path:** `get_theme_mod()` keeps working through the `theme_mod_{name}` filters, so existing PHP and third-party code is unaffected.
- **Write path:** the Customizer and `set_theme_mod()` write through the `pre_set_theme_mod_{name}` filters into `forgewp_theme_state`.
- **Migration:** on first activation, existing values are copied once from `theme_mods_{stylesheet}`, and the run is recorded in `forgewp_theme_state['_migrated_from']`.
- **Ownership:** the code is emitted into `functions.php` in Phase A and moves unchanged into the Companion Plugin in Phase B.

### Errors

None specific; a misconfigured project with no declared options returns `{ "v": 1, "options": {}, "themeMods": {} }`.

### Parity check

The native `forgeWpHydration.resources.siteSettings` on `/` deep-equals the `GET /wp-json/forgewp/v1/site-settings` body in the cloud sandbox.

---

## `forms` / `form`

Client-facing definition of native forms: the client-owned fields editable in wp-admin and the label overrides. **Never** includes `mailTo`, subjects, notification bodies, confirmation settings or other server-only config.

- **Routes:**
  - `GET /wp-json/forgewp/v1/forms?lang=<code>` — all forms
  - `GET /wp-json/forgewp/v1/forms/<name>?lang=<code>` — one form
  - (existing) `POST /wp-json/forgewp/v1/forms/<name>/submit`
- **Auth:** public GET; submit unchanged (nonce when logged in, honeypot, time trap, rate limit)
- **Cache tags:** `forms`, `form:<name>`
- **Native key:** `forgeWpHydration.resources.forms` (all forms for the current language)

### Response — one form

```json
{
  "v": 1,
  "name": "contact",
  "lang": "en",
  "fields": [
    { "name": "subject", "label": "Subject", "type": "select", "required": true, "options": ["General", "Support"] },
    { "name": "message", "label": "Message", "type": "textarea", "required": true }
  ],
  "fieldLabels": { "name": "Your name", "email": "Email address" },
  "submitPath": "/wp-json/forgewp/v1/forms/contact/submit"
}
```

- `fields` are the client-owned field descriptors (the existing `WpFormFieldDescriptor` shape: `name`, `label`, `type`, `required`, plus `options`, `multiple`, `min`, `max`, `step`, `defaultValue`, `placeholder` when set) for the resolved language, in stored order. They come from the same function that builds native hydration (`forgewp_forms_hydration_payload()`).
- `fieldLabels` are wp-admin label overrides for developer-owned fields.
- `submitPath` is relative to the WordPress origin, so the runtime can post to it in every mode and nothing hardcodes the route.
- The all-forms response is `{ "v": 1, "lang": "en", "forms": { "<name>": <one-form body without v/lang> } }`.

### Errors

- Unknown form: `404 { "code": "forgewp_form_not_found", ... }`.
- A form in `mode: 'shortcode'` is not exposed (404). Shortcode forms have no client contract.

### Cross-origin and proxies (applies to GET and submit)

- **CORS:** when `FORGEWP_FRONTEND_ORIGIN` is defined (constant or env, comma-separated list), responses to matching `Origin`s send `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`, `Access-Control-Allow-Credentials: true`, and preflight allows `GET, POST, OPTIONS` with `Content-Type, X-WP-Nonce`. The same helper is shared with `@forgewp/auth` so both behave identically.
- **Client IP for rate limiting:** `REMOTE_ADDR` by default. When the request comes from a trusted proxy (`FORGEWP_TRUSTED_PROXIES`, a list of IPs/CIDRs, or `X-ForgeWP-Proxy-Secret` matching `FORGEWP_PROXY_SECRET`), the left-most untrusted address in `X-Forwarded-For` is used instead. This keeps a Next.js server or the future edge router from collapsing every visitor into one rate-limit bucket.

### Parity check

The native `forgeWpHydration.resources.forms.contact` (minus the wrapper keys) deep-equals `GET /wp-json/forgewp/v1/forms/contact?lang=<same>`, and a decoupled submit from another origin listed in `FORGEWP_FRONTEND_ORIGIN` stores a submission and sends mail.

---

## Open questions for the founder

1. **`private: true` on options:** add it now (small, before beta), or treat every declared option as public?
2. **Theme state migration:** confirm that moving ForgeWP-declared theme mods, `custom_logo` and `nav_menu_locations` into `forgewp_theme_state` (with read/write filters, so `get_theme_mod()` keeps working) is the intended Phase A change.
3. **Legacy hydration keys:** remove `forgeWpHydration.siteSettings` / `.forms` before the Dec 31 beta (recommended, so beta users never depend on them), or keep them through the beta?
