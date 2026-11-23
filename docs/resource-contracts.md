# ForgeWP Resource Contracts

**Status:** Approved by founder (2026-11-23) — Phase A pilots `site-settings` and `forms`. Gemini's draft (shapes already consumed by `ForgeWpRuntime`) merged with Claude's draft (storage, privacy, cross-origin rules); see §4.  
**Architecture Reference:** [dual-mode-portability-architecture.md](dual-mode-portability-architecture.md) · [parallel-workstreams.md](parallel-workstreams.md)

Every first-party ForgeWP resource has **one canonical JSON contract** shared across:
1. **Decoupled REST (`GET /wp-json/forgewp/v1/<restPath>`)** — emitted by PHP (Claude) and fetched by `restSource` (Gemini).
2. **Native Hydration (`window.forgeWpHydration.resources['<name>']`)** — injected inline by PHP (Claude) with **byte-for-byte the same JSON shape** as the REST response, and read by `nativeSource` (Gemini).
3. **Local Dev Fixtures (`fixtureSource`)** — mapped into the exact same shape during non-production development.

---

## Global Conventions

### Unified Error Envelope
All `/wp-json/forgewp/v1/*` endpoints return JSON errors matching:

```json
{
  "code": "FORGEWP_RESOURCE_NOT_FOUND",
  "message": "Human-readable error message.",
  "data": { "status": 404 }
}
```

For validation failures (e.g., `POST /wp-json/forgewp/v1/forms/<name>/submit`), include an optional `errors` field map:

```json
{
  "code": "FORGEWP_VALIDATION_FAILED",
  "message": "Please correct the highlighted fields.",
  "errors": {
    "email": "Please enter a valid email address."
  }
}
```

### Native Hydration Container
PHP populates `window.forgeWpHydration.resources` keyed by canonical resource name:

```json
{
  "resources": {
    "site-settings": { "...": "identical to GET /wp-json/forgewp/v1/site-settings" },
    "forms": { "...": "identical to GET /wp-json/forgewp/v1/forms" }
  }
}
```

*(Transition note: while Phase A PHP emitters roll out, `nativeSource` transparently falls back to reading legacy `window.forgeWpHydration.siteSettings` and `window.forgeWpHydration.forms` and normalizes them to the canonical shapes below.)*

---

## 1. `site-settings` (Phase A Pilot #1 — Status: Approved)

- **Resource Name:** `site-settings`
- **REST Route:** `GET /wp-json/forgewp/v1/site-settings`
- **Auth:** `public` (returns **only** explicitly declared `wp.config` public `options` and `themeMods` + public site metadata — never arbitrary `wp_options` rows or secrets)
- **Query Params:** none (future: optional `lang` when localized options are added)
- **Cache Tags:** `["site-settings", "options"]`
- **HTTP Caching:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` (overridable by edge/host)

### Response JSON (`200 OK`)

```json
{
  "options": {
    "contact_phone": "+1 (555) 019-9000",
    "contact_email": "hello@example.com",
    "social_facebook": "https://facebook.com/example"
  },
  "themeMods": {
    "custom_logo": "https://example.com/wp-content/uploads/logo.png",
    "footer_text": "© 2026 Example Studio"
  },
  "site": {
    "name": "Example Studio",
    "description": "Modern WordPress built with React",
    "url": "https://example.com",
    "homeUrl": "https://example.com",
    "language": "en_US",
    "logoUrl": "https://example.com/wp-content/uploads/logo.png"
  }
}
```

### Field Guarantees
- `options`: `Record<string, string | number | boolean | null>` — keys match `wp.config.options` (declared via `defineWpOptions`). Every value is resolved to its live saved value or declared `default` (never raw field-descriptor objects `{ _type, default }`).
- `themeMods`: `Record<string, string | number | boolean | null>` — camelCase key in JSON (`themeMods`). Values are read from plugin-owned options (with `theme_mods_{slug}` fallback during migration).
- `site`: public site identity matching `WpServerSiteInfo` (without transport `mode`).

### Error Cases
- `500 FORGEWP_INTERNAL_ERROR` if WordPress fails unexpectedly. If no options/themeMods are declared in `wp.config`, returns `200 OK` with `{ "options": {}, "themeMods": {}, "site": { ... } }`.

---

## 2. `forms` (Phase A Pilot #2 — Status: Approved)

- **Resource Name:** `forms` (collection) / `forms:<name>` (single form lookup)
- **REST Routes:**
  - `GET /wp-json/forgewp/v1/forms` (all registered native forms, keyed by form slug)
  - `GET /wp-json/forgewp/v1/forms/<name>` (single form contract)
  - `POST /wp-json/forgewp/v1/forms/<name>/submit` (existing submission endpoint; add `FORGEWP_FRONTEND_ORIGIN` CORS + trusted-proxy client IP support)
- **Auth:** `public` (returns **only** sanitized public presentation metadata — **never** `mailTo`, `cc`, `bcc`, honeypot secrets, webhook URLs, or internal admin settings)
- **Query Params:**
  - `lang` (optional, string, e.g. `en`, `de`): selects localized `fieldLabels` and localized `clientFields` (`fields`) matching `forgewp_forms_resolve_lang()`.
- **Cache Tags:** `["forms", "form:<name>"]`

### Single Form Response JSON (`GET /wp-json/forgewp/v1/forms/contact?lang=en` — `200 OK`)

```json
{
  "name": "contact",
  "mode": "native",
  "lang": "en",
  "submitUrl": "https://example.com/wp-json/forgewp/v1/forms/contact/submit",
  "fieldLabels": {
    "name": "Your Name",
    "email": "Work Email"
  },
  "fields": [
    {
      "name": "company",
      "label": "Company",
      "type": "text",
      "required": true,
      "placeholder": "Acme Inc."
    },
    {
      "name": "topic",
      "label": "Topic",
      "type": "select",
      "required": false,
      "options": ["Sales", "Support"],
      "multiple": false
    }
  ]
}
```

### Collection Response JSON (`GET /wp-json/forgewp/v1/forms?lang=en` — `200 OK`)

```json
{
  "lang": "en",
  "forms": {
    "contact": {
      "name": "contact",
      "mode": "native",
      "lang": "en",
      "submitUrl": "https://example.com/wp-json/forgewp/v1/forms/contact/submit",
      "fieldLabels": {
        "name": "Your Name"
      },
      "fields": []
    }
  }
}
```

### Field Guarantees
- `mode`: `"native"` (shortcode-mode forms return `400 FORGEWP_FORM_SHORTCODE_ONLY` on single-form REST lookup or are omitted from native form schemas, never exposing raw shortcode internals).
- `fieldLabels`: `Record<string, string>` — admin-overridden labels for developer-owned fields.
- `fields`: `WpFormFieldDescriptor[]` — client-owned dynamic fields in stored display order (`name`, `label`, `type`, `required`, plus optional `options`, `multiple`, `min`, `max`, `step`, `defaultValue`, `placeholder`).
- `submitUrl`: canonical POST URL for the form.

### Error Cases
- `404 FORGEWP_FORM_NOT_FOUND` — unknown `<name>` slug.
- `400 FORGEWP_FORM_SHORTCODE_ONLY` — `<name>` is configured with `mode: 'shortcode'` (Tier 3 native-pinned).

---

## 4. Approved Additions (2026-11-23)

### 4.1 Private options
`defineWpOptions` entries accept `private: true`. Private options are **omitted** from both `GET /site-settings` and `resources['site-settings']`, and are only available to PHP. Every other declared option is public, because it exists to be rendered on the site.

### 4.2 Theme state storage (breaking, Phase A; moves into the Companion Plugin in Phase B)
WordPress stores theme mods per theme (`theme_mods_{stylesheet}`), and `nav_menu_locations` and `custom_logo` live there too, so switching or swapping the theme loses them (dual-mode doc §8.4). ForgeWP-declared theme mods, `custom_logo` and `nav_menu_locations` move to one option, `forgewp_theme_state`:
- **Read path:** `get_theme_mod()` keeps working via the `theme_mod_{name}` filters, so existing PHP and third-party code are unaffected.
- **Write path:** the Customizer and `set_theme_mod()` write through `pre_set_theme_mod_{name}` into `forgewp_theme_state`.
- **Migration:** on first activation, existing values are copied once from `theme_mods_{stylesheet}`; the run is recorded as `forgewp_theme_state['_migrated_from']`.
- `themeMods.custom_logo` in the resource is the logo **URL** (per §1); the stored value stays the attachment ID.

### 4.3 Cross-origin and proxies (forms GET + submit; shared with `@forgewp/auth`)
- **CORS:** WordPress core already answers every `Origin` on REST routes with `Access-Control-Allow-Origin: <origin>` and credentials, so cross-origin decoupled frontends work by default. When `FORGEWP_FRONTEND_ORIGIN` is defined (constant or env, comma-separated), it becomes an allowlist for ForgeWP forms routes: other origins get no CORS headers and their submissions are rejected with `403 FORGEWP_ORIGIN_DENIED`; listed origins and the site's own origins are served with `Vary: Origin`. `@forgewp/auth` is stricter: it always accepts only the site's own origins plus this list. The first listed origin is the base URL for links in auth emails.
- **Client IP for rate limiting:** `REMOTE_ADDR` by default. From a trusted proxy (`FORGEWP_TRUSTED_PROXIES` IPs/CIDRs, or `X-ForgeWP-Proxy-Secret` equal to `FORGEWP_PROXY_SECRET`), use the right-most address in `X-Forwarded-For` that is not itself a trusted proxy, so a Next.js server or edge router does not collapse all visitors into one bucket.

### 4.4 Legacy hydration keys
`forgeWpHydration.siteSettings` and `.forms` are removed **before the Dec 31 beta**. Order: Claude emits `resources.*` alongside the legacy keys → Gemini's runtime reads `resources.*` first (already the case in `native-source.ts`) → one PR deletes the legacy keys, signed off in both agents' handoff notes.

### 4.5 Parity checks (verified in the cloud sandbox before a resource is marked done)
"Identical" means deep-equal after `JSON.parse`: WordPress REST escapes `/` and non-ASCII characters (`\/`, `\u00a9`) while the inline hydration script does not, so raw bytes differ for the same data.

- `resources['site-settings']` on `/` deep-equals the `GET /site-settings` body.
- `resources.forms.forms.contact` deep-equals `GET /forms/contact?lang=<same>`, and a decoupled submit from an origin listed in `FORGEWP_FRONTEND_ORIGIN` stores a submission and sends mail.

---

## 5. `menus` (Phase C — Status: Draft — Awaiting Founder & Claude Approval)

- **Resource Name:** `menus` (collection) / `menus:<location>` (single menu location)
- **REST Routes:**
  - `GET /wp-json/forgewp/v1/menus` (all registered menu locations, keyed by location slug)
  - `GET /wp-json/forgewp/v1/menus/<location>` (single menu location — aligns with existing `/forgewp/v1/menus/<location>` endpoint)
- **Auth:** `public`
- **Query Params:**
  - `lang` (optional, string, e.g. `en`, `de`): when Polylang/WPML is active, resolves the localized menu assigned to `<location>` for that language.
- **Cache Tags:** `["menus", "menu:<location>"]`
- **Hydration Key:** `window.forgeWpHydration.resources.menus` (collection shape below)

### Single Menu Response JSON (`GET /wp-json/forgewp/v1/menus/primary?lang=en` — `200 OK`)

```json
{
  "location": "primary",
  "lang": "en",
  "items": [
    {
      "id": 42,
      "title": "About",
      "url": "https://example.com/about/",
      "path": "/about/",
      "target": "",
      "classes": ["menu-item"],
      "description": "",
      "attrTitle": "",
      "children": [
        {
          "id": 43,
          "title": "Team",
          "url": "https://example.com/about/team/",
          "path": "/about/team/",
          "target": "",
          "classes": [],
          "description": "",
          "attrTitle": "",
          "children": []
        }
      ]
    }
  ]
}
```

### Collection Response JSON (`GET /wp-json/forgewp/v1/menus?lang=en` — `200 OK`)

```json
{
  "lang": "en",
  "menus": {
    "primary": [
      {
        "id": 42,
        "title": "About",
        "url": "https://example.com/about/",
        "path": "/about/",
        "target": "",
        "classes": [],
        "children": []
      }
    ],
    "footer": []
  }
}
```

### Field Guarantees
- `menus`: `Record<string, WpMenuItem[]>` — reads location assignments from `forgewp_theme_state` (via `get_nav_menu_locations()`, surviving theme swaps per §4.2).
- `path`: site-relative path derived from `url` (stripping `homeUrl` origin + subdirectory base path); for external URLs (`https://other.com`), `path` equals `url`.
- `children`: always an array (`[]` for leaf items).
- Unknown or unassigned `<location>` on `GET /menus/<location>` returns `200 OK` with `{ "location": "<location>", "lang": "<lang>", "items": [] }` (never 500; avoids breaking optional footer/sidebar slots).

### Legacy Cleanup Plan
- Once PHP emits `resources.menus` and `nativeSource` reads `resources.menus` only, remove top-level `window.forgeWpHydration.menus` in one coordinated PR (same pattern as §4.4).

---

## 6. `routes` (Phase C — Status: Draft — Awaiting Founder & Claude Approval)

- **Resource Name:** `routes`
- **REST Route:** `GET /wp-json/forgewp/v1/routes` (extends existing endpoint)
- **Auth:** `public` (published pages only — never exposes `draft`, `pending`, `private`, or password-protected pages)
- **Query Params:**
  - `lang` (optional, string): when multilingual plugins or local i18n are active, resolves permalinks for that locale.
- **Cache Tags:** `["routes"]`
- **Hydration Key:** `window.forgeWpHydration.resources.routes`

### Response JSON (`GET /wp-json/forgewp/v1/routes` — `200 OK`)

```json
{
  "homeUrl": "https://example.com",
  "basePath": "",
  "lang": "en",
  "routes": [
    {
      "routeId": "front-page",
      "id": 10,
      "slug": "home",
      "title": "Home",
      "path": "/",
      "permalink": "https://example.com/"
    },
    {
      "routeId": "about",
      "id": 11,
      "slug": "our-story",
      "title": "About",
      "path": "/our-story/",
      "permalink": "https://example.com/our-story/"
    }
  ],
  "pageLinks": {
    "front-page": "/",
    "about": "/our-story/"
  }
}
```

### Field Guarantees
- `homeUrl`: canonical WordPress `home_url()` without trailing slash.
- `basePath`: subdirectory install prefix without trailing slash (e.g. `""` or `"/wp"`).
- `routes`: array of published pages that carry `forgewp_route_id` (or are mapped ForgeWP routes), surviving wp-admin slug renames (`routeId: "about"` → `slug: "our-story"`).
- `pageLinks`: `Record<string, string>` convenience lookup map (`routeId` → `path`) matching `useWpPageLink(routeId)` so client hooks resolve links in O(1) without scanning `routes[]`.

### Legacy Cleanup Plan
- Once PHP emits `resources.routes` (with `pageLinks`) and `nativeSource` reads `resources.routes` only, remove top-level `window.forgeWpHydration.pageLinks` in one coordinated PR.

---

## 7. `i18n` (Phase C — Status: Draft — Awaiting Founder & Claude Approval)

- **Resource Name:** `i18n`
- **REST Route:** `GET /wp-json/forgewp/v1/i18n`
- **Auth:** `public`
- **Query Params:**
  - `lang` (optional, string, e.g. `en`, `de`): requested locale. If omitted, resolves via active site/plugin default locale.
  - `path` (optional, string, e.g. `/about`): current route path so `urls` can return localized switcher URLs for that page when available.
- **Cache Tags:** `["i18n", "i18n:<lang>"]`
- **Hydration Key:** `window.forgeWpHydration.resources.i18n`

### Response JSON (`GET /wp-json/forgewp/v1/i18n?lang=de` — `200 OK`)

```json
{
  "currentLanguage": "de",
  "defaultLocale": "en",
  "locales": ["en", "de"],
  "translations": {
    "nav.home": "Startseite",
    "nav.contact": "Kontakt"
  },
  "urls": {
    "en": "/about/",
    "de": "/de/about/"
  },
  "homeUrls": {
    "en": "/",
    "de": "/de/"
  }
}
```

### Field Guarantees
- `currentLanguage`: active normalized locale code (never empty when i18n is configured; never defaults to hardcoded `'de'`).
- `defaultLocale`: configured default locale from `wp.config.i18n.defaultLocale` (or WordPress site locale prefix when i18n is not explicitly configured).
- `locales`: non-empty `string[]` of supported locales.
- `translations`: `Record<string, string>` — active locale's translation dictionary (merged defaults + any wp-admin overrides).
- `urls` / `homeUrls`: `Record<string, string>` — locale-keyed language-switcher URLs (empty objects `{}` if single-language).

### Error Cases
- `404 FORGEWP_LOCALE_NOT_FOUND` — explicit `?lang=<unknown>` is not in the site's configured `locales`.

### Legacy Cleanup Plan
- Once PHP emits `resources.i18n` and `nativeSource` reads `resources.i18n` only, remove legacy `window.forgeWpTranslations` / `window.forgeWpLocale` globals in one coordinated PR.

---

### Claude review of §5–§7 (2026-11-23) — approve with three amendments

Compatibility checked against the live endpoints: `/menus/<location>` today returns `{ location, items }` with `id, title, url, path, target, classes, children`, and `/routes` returns `{ homeUrl, basePath, routes }`; the drafts only add fields (`lang`, `description`, `attrTitle`, `pageLinks`), so existing decoupled consumers keep working. Amendments, all driven by the plugin-only (decoupled) deployment that Phase B enables:

1. **i18n dictionary ships with the backend.** Today PHP reads `translations.json` from the theme directory, so with only the Companion Plugin active (another theme) `/i18n` would have no dictionary. The compiler embeds the dictionary in the Companion backend; `translations` is identical in native and plugin-only mode. (Claude, PHP.)
2. **`/menus` collection keys come from the project, not only the active theme.** Menu locations are registered by the active theme, which under another theme is none. The collection includes every location declared in `cms/menus` plus registered locations plus locations assigned in `forgewp_theme_state`; each key is present (`[]` when unassigned).
3. **One rule for an unknown `?lang=`:** `404 FORGEWP_LOCALE_NOT_FOUND` on `menus`, `routes` and `i18n` alike when i18n is configured and the code is not in `locales`; ignored on single-language sites.

Minor, optional: menu items could carry `"external": true` for off-site URLs (where `path` equals `url`), so consumers need not compare origins.

---

## 8. Remaining Phase C Resource Contracts (Reserved Names)

Registered in `@forgewp/react`'s lean resource registry with reserved paths so runtime wiring stays uniform:

| Resource Name | REST Path | Auth | Cache Tags | Status |
|---|---|---|---|---|
| `site-settings` | `/site-settings` | `public` | `["site-settings", "options"]` | Approved (Phase A) |
| `forms` | `/forms` | `public` | `["forms", "form:<name>"]` | Approved (Phase A) |
| `menus` | `/menus` | `public` | `["menus", "menu:<location>"]` | Draft (Phase C — §5) |
| `routes` | `/routes` | `public` | `["routes"]` | Draft (Phase C — §6) |
| `i18n` | `/i18n` | `public` | `["i18n", "i18n:<lang>"]` | Draft (Phase C — §7) |
| `seo` | `/seo` | `public` | `["seo"]` | Reserved (Phase C) |
| `editables` | `/editables` | `public` | `["editables"]` | Reserved (Phase C) |
| `auth-me` | `/auth/me` | `session` | `["auth"]` | Reserved (Phase C) |
