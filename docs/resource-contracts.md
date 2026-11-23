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

## 5. `menus` (Phase C — Status: Approved 2026-11-23, with Claude's amendments below)

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

## 6. `routes` (Phase C — Status: Approved 2026-11-23, with Claude's amendments below)

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

## 7. `i18n` (Phase C — Status: Approved 2026-11-23, with Claude's amendments below)

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

### Claude review of §5–§7 (2026-11-23) — approved by founder with these three amendments

Compatibility checked against the live endpoints: `/menus/<location>` today returns `{ location, items }` with `id, title, url, path, target, classes, children`, and `/routes` returns `{ homeUrl, basePath, routes }`; the drafts only add fields (`lang`, `description`, `attrTitle`, `pageLinks`), so existing decoupled consumers keep working. Amendments, all driven by the plugin-only (decoupled) deployment that Phase B enables:

1. **i18n dictionary ships with the backend.** Today PHP reads `translations.json` from the theme directory, so with only the Companion Plugin active (another theme) `/i18n` would have no dictionary. The compiler embeds the dictionary in the Companion backend; `translations` is identical in native and plugin-only mode. (Claude, PHP.)
2. **`/menus` collection keys come from the project, not only the active theme.** Menu locations are registered by the active theme, which under another theme is none. The collection includes every location declared in `cms/menus` plus registered locations plus locations assigned in `forgewp_theme_state`; each key is present (`[]` when unassigned).
3. **One rule for an unknown `?lang=`:** `404 FORGEWP_LOCALE_NOT_FOUND` on `menus`, `routes` and `i18n` alike when i18n is configured and the code is not in `locales`; ignored on single-language sites.

Minor, optional — **adopted in the PHP (2026-11-23):** every menu item carries `"external": boolean`; for off-site URLs `path` equals `url`. Note for consumers: `routes.homeUrl` now has no trailing slash, as §6 specifies (the pre-contract endpoint returned one).

---

## 9. `auth-me` (Phase C — Status: Approved 2026-11-23 with Gemini's amendments (§12a)) — **beta-critical**

Why first: in decoupled mode `WpServerRequireAuth`, `WpServerAuthGate` and `pageConfig.protected` currently render their children for everyone (`packages/react/src/server.ts`), so protected pages are public. This contract gives server-side guards one reliable answer.

- **Resource Name:** `auth-me`
- **REST Route:** `GET /wp-json/forgewp/v1/auth/me` (existing endpoint; response extended, existing `user` key kept)
- **Auth:** `session` — the visitor's WordPress session: logged-in cookie (same-domain / Hybrid / BFF proxy) or `Authorization: Bearer <jwt>` (cross-origin, when the JWT backend is enabled). No nonce needed for this read.
- **Caching:** `Cache-Control: private, no-store` and `Vary: Cookie, Authorization`. Never cached at an edge or shared cache; the Next.js server must call it per request (`cache: 'no-store'`).
- **Native key:** `forgeWpHydration.resources['auth-me']` (same shape; already rendered per request by PHP).

### Response (`200 OK`, logged in)

```json
{
  "authenticated": true,
  "user": {
    "id": 7,
    "username": "ada",
    "displayName": "Ada Lovelace",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "avatarUrl": "https://example.com/avatar/7.png",
    "roles": ["subscriber"],
    "capabilities": ["read"],
    "emailVerified": true
  }
}
```

Logged out: `200 OK` with `{ "authenticated": false, "user": null }` (never 401, so guards can tell "logged out" from "auth broken").

### Guard semantics (Gemini, `server.ts`) — must match native PHP guards
- `WpServerRequireAuth({ allowed?, redirect })`: not authenticated → `redirect(redirect)`; authenticated but `allowed` (role or capability, any-of) not met → Next.js `forbidden()` / 403 page; otherwise render children.
- `WpServerAuthGate({ allowed?, fallback })`: render children only when authenticated and allowed, else `fallback`.
- `pageConfig.protected`: same as `WpServerRequireAuth` for the whole route.
- **Fail closed:** WordPress unreachable, timeout or non-200 → treat as not authenticated; never render protected children on error.
- The Next.js server forwards only the visitor's WordPress cookies (`wordpress_logged_in_*`, `wordpress_sec_*`) and `Authorization` header to `/auth/me`; it does not forward other cookies.

### Session transport by deployment
| Deployment | How the Next.js server sees the session |
|---|---|
| Same domain (Hybrid / ForgeWP edge router / Next rewrite of `/wp-json/*` and `/wp-login.php`) | WordPress cookies are first-party; forward them. Recommended. |
| Cross-origin self-hosted (`app.example.com` + `wp.example.com`) | Cookies set by WordPress are not visible to the app domain. Use the JWT backend (token stored by the app as an HttpOnly cookie on its own domain) or a BFF proxy route. `forgewp doctor --target decoupled` warns when a project has protected routes and neither same-domain routing nor JWT is configured. |

### Field guarantees
- `user` keeps today's payload for compatibility (it also includes `billing`, `shipping`, `meta` for WooCommerce/account screens); guards rely only on `authenticated`, `roles`, `capabilities`.
- `capabilities`: capabilities the user actually has (true), as a list.

### Claude (PHP) work
Add `authenticated`; `private, no-store` + `Vary` headers; same shape in `resources['auth-me']`; parity test.

---

## 10. `posts` (Phase C — Status: Approved 2026-11-23 with Gemini's amendments (§12a))

Why: decoupled pages today read `wp/v2/*` with `_embed` and reshape it in `server.ts`, while native templates use PHP template tags. One normalized, privacy-safe shape removes that drift and covers custom post types.

- **Resource Name:** `posts` (list) / `post` (single)
- **REST Routes:**
  - `GET /wp-json/forgewp/v1/posts?type=post&page=1&perPage=10&lang=&taxonomy=<tax>&term=<slug>&search=&orderby=date|title|menu_order&order=desc|asc`
  - `GET /wp-json/forgewp/v1/posts/<type>/<slug>?lang=`
- **Auth:** public — `publish` status only, public post types that ForgeWP registered or core `post`/`page`. Drafts and previews are out of scope here (Draft Mode is a separate Phase E item).
- **Cache tags:** `posts`, `type:<type>`, `post:<id>`
- **Native keys:** `resources.post` on singular views (current queried post), `resources.posts` on archive views (current main query page).

### Single response (`200 OK`)

```json
{
  "id": 42,
  "type": "post",
  "slug": "first-post",
  "lang": "en",
  "title": "First post",
  "excerpt": "<p>Short summary…</p>",
  "content": "<p>Full HTML body…</p>",
  "date": "2026-11-01T09:00:00+00:00",
  "modified": "2026-11-02T10:00:00+00:00",
  "permalink": "https://example.com/blog/first-post/",
  "path": "/blog/first-post/",
  "author": { "id": 1, "name": "Ada" },
  "featuredImage": { "url": "https://example.com/uploads/a.jpg", "alt": "", "width": 1200, "height": 630, "srcset": "…" },
  "terms": { "category": [{ "id": 3, "slug": "news", "name": "News", "path": "/category/news/" }] },
  "fields": { "read_time": "5" },
  "protected": false
}
```

### List response (`200 OK`)

```json
{ "type": "post", "lang": "en", "page": 1, "perPage": 10, "total": 23, "totalPages": 3, "items": [ /* single shape without "content" and "fields" */ ] }
```

### Field guarantees
- `content` / `excerpt` are rendered HTML (`the_content` / `the_excerpt` filters), matching native output.
- Password-protected posts: `protected: true`, `content: ""`, `excerpt: ""`.
- `fields`: only meta keys ForgeWP registered for that type (editable schemas / `register_post_meta` with `show_in_rest`), never arbitrary meta.
- `featuredImage`: `null` when absent.
- `path`: site-relative (subdirectory base stripped), consistent with `routes`.
- `perPage` max 100.

### Errors
- `404 FORGEWP_POST_NOT_FOUND` — unknown slug or not published.
- `400 FORGEWP_POST_TYPE_NOT_PUBLIC` — unknown or non-public `type`.
- `?lang=` per amendment 3.

### Open question
Existing `/forgewp/v1/query-<id>` routes (from `useWpQuery`) stay as they are for now; should they be re-expressed on top of `posts` later?

---

## 11. `terms` (Phase C — Status: Approved 2026-11-23 with Gemini's amendments (§12a))

- **REST Routes:** `GET /wp-json/forgewp/v1/terms/<taxonomy>?lang=&hideEmpty=true&parent=` and `GET /wp-json/forgewp/v1/terms/<taxonomy>/<slug>?lang=`
- **Auth:** public, public taxonomies only.
- **Cache tags:** `terms`, `taxonomy:<taxonomy>`
- **Native key:** `resources.term` on taxonomy archive views.

```json
{ "taxonomy": "category", "lang": "en", "items": [
  { "id": 3, "slug": "news", "name": "News", "description": "", "count": 12, "parent": 0, "path": "/category/news/", "permalink": "https://example.com/category/news/" }
] }
```

Single: the item object plus `"taxonomy"` and `"lang"`. Errors: `404 FORGEWP_TERM_NOT_FOUND`, `400 FORGEWP_TAXONOMY_NOT_PUBLIC`. Posts in a term: `posts?taxonomy=category&term=news`.

---

## 12. `comments` (Phase C — Status: Approved 2026-11-23 with Gemini's amendments (§12a))

- **REST Routes:**
  - `GET /wp-json/forgewp/v1/comments?post=<id>&page=1&perPage=50`
  - `POST /wp-json/forgewp/v1/comments`
- **Auth:** public read of approved comments; posting follows the post's and site's discussion settings.
- **Cache tags:** `comments`, `comments:post:<id>`

### Read response

```json
{ "post": 42, "open": true, "page": 1, "perPage": 50, "total": 3, "items": [
  { "id": 9, "parentId": 0, "author": { "name": "Grace", "avatarUrl": "https://…", "url": "" }, "date": "2026-11-03T08:00:00+00:00", "content": "<p>Great post</p>", "children": [] }
] }
```

Never exposes commenter email or IP. `content` is rendered and sanitized (`comment_text`). Threaded per the site's thread depth; `items` are top-level, replies in `children`.

### Create request / response

Request: `{ "post": 42, "parent": 0, "content": "…", "authorName": "…", "authorEmail": "…", "authorUrl": "" }` (name/email ignored for logged-in users; required when the site requires them).

Response `201`: `{ "ok": true, "status": "approved" | "hold", "comment": <item> | null }` — `hold` when moderation applies, so the UI can say "awaiting moderation".

Protections, shared with forms (contract §4.3): origin allowlist, trusted-proxy client IP rate limit, honeypot + time trap, nonce when logged in, WordPress core `wp_allow_comment()` flood/duplicate checks and comment moderation keys.

Errors: `403 FORGEWP_COMMENTS_CLOSED`, `400 FORGEWP_VALIDATION_FAILED` (with `errors` map), `404 FORGEWP_POST_NOT_FOUND`, `409 FORGEWP_COMMENT_DUPLICATE`, `429 FORGEWP_RATE_LIMITED`.

---

## 12a. Approved amendments to §9–§12 (Gemini review, accepted by Claude and founder, 2026-11-23)

1. **Guard names and 403 handling (§9).** `server.ts` exports both `WpServerRequireAuth` / `WpServerAuthGate` and the aliases `WpRequireAuth` / `WpAuthGate`; keep all four. Do not hard-require Next.js `forbidden()` (it needs `experimental.authInterrupts`): authenticated-but-not-allowed visitors trigger Next.js `forbidden()` (real HTTP 403) automatically when `experimental.authInterrupts: true` is enabled; otherwise they get `forbiddenFallback` (default: an HTTP 200 page rendering a built-in 403 view) or `forbiddenRedirect` when set. Unauthenticated visitors get `redirect()`.
   - **Security testing note (`next dev` vs production):** Under `next dev` only, React's development RSC debug metadata includes guard `children` props (protected text) in the RSC payload. Production builds (`next build && next start`) do **not** include this debug metadata — always verify auth security against a production build, never `next dev`.
2. **JWT cookie forwarding (§9).** Cross-origin JWT deployments store the token in an HttpOnly cookie on the app domain, default name `forgewp_auth_token` (configurable via `createWpServerClient({ authCookieName })`). The Next.js server sends it to `/auth/me` as `Authorization: Bearer <token>`, alongside the `wordpress_logged_in_*` / `wordpress_sec_*` cookies and any incoming `Authorization` header.
3. **`blocks` on single posts (§10).** Single `post` responses include `"blocks": WpServerBlockNode[]` (from `forgewp_blocks`; `[]` when unused) so `<BlockArea>` keeps decoupled parity without `wp/v2`.
4. **Plain-text titles (§10).** `title` is entity-decoded plain text; `excerpt` and `content` are rendered HTML. `/forgewp/v1/query-<id>` stays as is (compiled queries are safer than arbitrary public query params).
5. **Comment anti-spam fields (§12).** `POST /comments` uses the same client fields as forms: `_forgewp_elapsed`, `_forgewp_interacted`, and the honeypot `_forgewp_hp`, so `@forgewp/react` shares one dwell/interaction tracker with `submitWpForm()`.

---

## 8. Remaining Phase C Resource Contracts (Reserved Names)

Registered in `@forgewp/react`'s lean resource registry with reserved paths so runtime wiring stays uniform:

| Resource Name | REST Path | Auth | Cache Tags | Status |
|---|---|---|---|---|
| `site-settings` | `/site-settings` | `public` | `["site-settings", "options"]` | Approved (Phase A) |
| `forms` | `/forms` | `public` | `["forms", "form:<name>"]` | Approved (Phase A) |
| `menus` | `/menus` | `public` | `["menus", "menu:<location>"]` | Approved (Phase C — §5) |
| `routes` | `/routes` | `public` | `["routes"]` | Approved (Phase C — §6) |
| `i18n` | `/i18n` | `public` | `["i18n", "i18n:<lang>"]` | Approved (Phase C — §7) |
| `seo` | `/seo?path=` | `public` | `["seo", "seo:path:<path>"]` | Draft (§13) |
| `editables` | `/editables` | `public` | `["editables", "post:<id>"]` | Draft (§14) |
| `auth-me` | `/auth/me` | `session` | `["auth"]` | Approved (Phase C — §9, §12a) |
| `posts` / `post` | `/posts`, `/posts/<type>/<slug>` | `public` | `["posts", "type:<type>", "post:<id>"]` | Approved (Phase C — §10, §12a) |
| `terms` | `/terms/<taxonomy>` | `public` | `["terms", "taxonomy:<taxonomy>"]` | Approved (Phase C — §11) |
| `comments` | `/comments` | `public` read / guarded write | `["comments", "comments:post:<id>"]` | Approved (Phase C — §12, §12a) |

---

## 13. `seo` (Phase C — Status: Draft by Gemini for Claude review & founder approval, 2026-11-23)

Why: in decoupled mode, Next.js has no access to WordPress's `wp_head` hook, so SEO metadata managed by Yoast SEO, Rank Math, Polylang hreflang, or ForgeWP schemas is absent on the decoupled origin. This contract replaces site-specific PHP workarounds (such as `hotelchecker24`'s `hreflang.php`, `og-fallback.php`, and `schemas.php`) with one portable resource powering Next.js `generateMetadata()` and JSON-LD rendering.

- **Resource Name:** `seo`
- **REST Route:** `GET /wp-json/forgewp/v1/seo?path=<path>&lang=<lang>`
- **Auth:** `public` — only resolves published public posts/pages, public CPT singles, public CPT archives, public taxonomy archives, the front page, or the posts page. Never exposes `draft`, `pending`, `private`, `trash`, or password-protected content (`content` / private meta never leak; password-protected posts return `404` or minimal robots `noindex` without private fields — **question below**).
- **Query Params:**
  - `path` (required, string): site-relative URL path (e.g. `/`, `/en/contact/`, `/blog/first-post/`). Query strings are ignored for route resolution; full external `http(s)://` URLs are rejected (`400 FORGEWP_INVALID_PATH`).
  - `lang` (optional, string): explicit locale override; validated per Amendment 3 (`404 FORGEWP_LOCALE_NOT_FOUND` on unknown locale when i18n is configured).
- **Cache Tags:** `["seo", "seo:path:<normalized-path>"]` (plus `"post:<id>"` or `"term:<id>"` when resolved to a post or term).
- **HTTP Caching:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` (overridable by host/edge).
- **Native Hydration Key:** `window.forgeWpHydration.resources.seo` (same JSON shape for parity CI and client inspection; in Native mode, WordPress `wp_head` remains authoritative for `<head>` HTML).

### Frontend-Domain Canonical & Alternate Rewriting (`FORGEWP_FRONTEND_ORIGIN`)
- WordPress runs on the backend origin (e.g. `https://wp.example.com`), while the decoupled site is served on the frontend origin (first origin in `FORGEWP_FRONTEND_ORIGIN`, e.g. `https://example.com`, per §4.3).
- When `FORGEWP_FRONTEND_ORIGIN` is configured, PHP rewrites URLs whose origin matches `forgewp_raw_home_url()` to the frontend origin in:
  - `canonical` and `alternates.canonical`
  - `alternates.languages[*]` (all hreflang URLs including `x-default`)
  - `openGraph.url`
  - Page-URL properties inside `jsonLd` (`@id`, `url`, `item` on `BreadcrumbList` / `ItemList` / `WebPage`)
- Media/upload URLs (`openGraph.images[].url`, `twitter.images[]`, JSON-LD `image` / `logo`) remain on the WordPress/CDN media origin and are **not** rewritten to the frontend origin.
- When `FORGEWP_FRONTEND_ORIGIN` is not configured, canonicals keep WordPress's `homeUrl` origin.

### SEO Plugin Bridge Priority
Reuses `forgewp_seo_plugin_active()` (which already accounts for Rank Math registration via `RankMath\Helper::is_invalid_registration()`):
1. **Yoast SEO** (`defined('WPSEO_VERSION')` and `YoastSEO()->meta`): reads Yoast title, meta description, canonical, robots, Open Graph, Twitter, and `wpseo_schema_graph` JSON-LD for the resolved WP query/object.
2. **Rank Math SEO** (`RankMath` active and registered): reads Rank Math title, description, canonical, robots, Open Graph, Twitter, and `rank_math/json_ld` schema for the resolved object.
3. **Extensibility filters:** `apply_filters('forgewp_seo_resource', $payload, $context)` and `apply_filters('forgewp_seo_json_ld', $schemas, $context)` allow AIOSEO / SEOPress adapters or project-specific CPT schemas (e.g. `Hotel`, `ItemList`, `FAQPage`) to participate cleanly.
4. **Core WordPress + ForgeWP fallback (`provider: "core"`):**
   - `title`: `wp_get_document_title()` / `<WpHead>` title fallback.
   - `description`: singular excerpt (`wp_strip_all_tags(get_the_excerpt())`) or `get_bloginfo('description')`.
   - `openGraph.images`: featured image (`full`) or `site.logoUrl` / fallback logo (filling missing `description` / `og:image` even when an active SEO plugin leaves them blank, matching `og-fallback.php`).
- **Hreflang (`alternates.languages`):** When Polylang/WPML is active, includes reciprocal localized URLs for every published translation plus `"x-default"` pointing to the default-language translation (falling back to the current page URL or default-language home URL, matching `hreflang.php`), rewritten to the frontend origin when `FORGEWP_FRONTEND_ORIGIN` is set. Empty `{}` on single-language sites.

### Response JSON (`GET /wp-json/forgewp/v1/seo?path=/en/contact/` — `200 OK`)

```json
{
  "path": "/en/contact/",
  "lang": "en",
  "provider": "yoast",
  "objectType": "post",
  "objectId": 17,
  "title": "Contact — Hotelchecker24",
  "description": "Get in touch with the Hotelchecker24 editorial team.",
  "canonical": "https://example.com/en/contact/",
  "robots": {
    "index": true,
    "follow": true,
    "maxSnippet": -1,
    "maxImagePreview": "large",
    "maxVideoPreview": -1
  },
  "openGraph": {
    "title": "Contact — Hotelchecker24",
    "description": "Get in touch with the Hotelchecker24 editorial team.",
    "type": "article",
    "url": "https://example.com/en/contact/",
    "siteName": "Hotelchecker24",
    "locale": "en_US",
    "images": [
      {
        "url": "https://wp.example.com/wp-content/uploads/contact-og.jpg",
        "width": 1200,
        "height": 630,
        "alt": "Hotelchecker24 Contact"
      }
    ]
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "Contact — Hotelchecker24",
    "description": "Get in touch with the Hotelchecker24 editorial team.",
    "site": "@hotelchecker24",
    "creator": "",
    "images": ["https://wp.example.com/wp-content/uploads/contact-og.jpg"]
  },
  "alternates": {
    "canonical": "https://example.com/en/contact/",
    "languages": {
      "de": "https://example.com/kontakt/",
      "en": "https://example.com/en/contact/",
      "x-default": "https://example.com/kontakt/"
    }
  },
  "jsonLd": [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://example.com/en/contact/",
      "url": "https://example.com/en/contact/",
      "name": "Contact — Hotelchecker24"
    }
  ]
}
```

### Field Guarantees
- `provider`: `"yoast" | "rankmath" | "aioseo" | "seopress" | "core"`.
- `objectType`: `"front-page" | "posts-page" | "post" | "term" | "post-type-archive"`.
- `objectId`: `number | null` (`null` for CPT archives).
- `title`, `description`, `canonical`: strings (entity-decoded plain text; empty string `""` when unset).
- `robots`: always present with boolean `index` and `follow` (plus optional numeric/string `maxSnippet`, `maxImagePreview`, `maxVideoPreview`).
- `openGraph.images` / `twitter.images` / `jsonLd`: always arrays (`[]` when empty).
- `alternates.languages`: always an object (`{}` when no alternate languages exist).

### Error Cases
- `400 FORGEWP_INVALID_PATH` — missing `path`, non-relative `http(s)://` URL, or invalid path syntax.
- `404 FORGEWP_SEO_NOT_FOUND` — `path` does not resolve to any published public WordPress route (404).
- `404 FORGEWP_LOCALE_NOT_FOUND` — explicit `?lang=<unknown>` per Amendment 3.

### Next.js Consumer (`@forgewp/react/server`)
- `wpClient.getSeo(path, { lang? })`: fetches `GET /wp-json/forgewp/v1/seo?path=...` in decoupled mode (with `['seo', 'seo:path:<path>']` cache tags) and returns `SeoResource | null` (returning `null` on `404`, throwing `ForgeWpRuntimeError` on `FORGEWP_LOCALE_NOT_FOUND` or `FORGEWP_INVALID_PATH`).
- `toNextMetadata(seo, fallback?)`: pure helper converting `SeoResource` into a Next.js `Metadata` object (`title`, `description`, `robots`, `openGraph`, `twitter`, `alternates`).
- `<WpJsonLd schemas={seo?.jsonLd} />`: server-safe `<script type="application/ld+json">` emitter escaping `<` as `\u003c` so embedded JSON-LD cannot break out of `<script>` tags.

### Questions for Claude (R4)
1. **Path resolution in REST context:** Are you comfortable simulating the main `WP_Query` / `WP::parse_request()` for `?path=` (so Yoast's `YoastSEO()->meta->for_url()` / Rank Math's context resolvers work identically on pages, CPT singles, CPT archives, and Polylang-prefixed paths like `/en/contact/`), or do you prefer resolving the post/term/archive explicitly and passing it to Yoast/Rank Math APIs?
2. **Password-protected posts:** Should `GET /seo?path=<protected-post>` return `200 OK` with title + `robots: { index: false, follow: false }` and empty `description`/`jsonLd` (so search engines see `noindex` without leaking content), or `404 FORGEWP_SEO_NOT_FOUND`?

---

## 14. `editables` (Phase C — Status: Draft by Gemini for Claude review & founder approval, 2026-11-23)

Why: in decoupled mode, `useWpMeta()` and `<WpRepeater>` currently fall back to static schema defaults (`getEditableDefaults()` / `defaultValue`) because there is no normalized REST resource for `defineEditable()` / ACF fields and repeaters. Today repeaters render stale/default rows in decoupled mode (visible content bug).

- **Resource Name:** `editables`
- **REST Route:** `GET /wp-json/forgewp/v1/editables`
- **Auth:** `public` — only serves **published, public** posts/pages and **only** field keys declared in the project's `cms/editables/*.ts` schemas (compiled into a static PHP schema manifest inside the Companion backend, same pattern as `forms` and `i18n`). Arbitrary `wp_postmeta`, `_`-prefixed WordPress internal keys, and fields marked `private: true` are never exposed.
- **Query Params:**
  - Target selector (at least one required):
    - `path` (string, e.g. `/` or `/en/about/`): resolves published post/page by site-relative path (including Polylang translations).
    - `routeId` (string, e.g. `about`, `front-page`): resolves via `forgewp_resolve_route_page_id()` (respecting `lang`).
    - `post` (integer): explicit published public post ID.
  - `lang` (optional, string): locale parameter per Amendment 3 (`404 FORGEWP_LOCALE_NOT_FOUND` on unknown locale when i18n is configured).
  - `schema` (optional, string): explicit schema name when targeting a specific `cms/editables/<schema>.ts` manifest entry; otherwise inferred from the resolved post's route/template/postType.
  - `keys` (optional, comma-separated string): optional subset of declared schema keys to return.
- **Cache Tags:** `["editables", "post:<id>"]` (plus `"route:<routeId>"` when present).
- **HTTP Caching:** `Cache-Control: public, max-age=60, stale-while-revalidate=300`.
- **Native Hydration Key:** `window.forgeWpHydration.resources.editables` (populated on singular views with the identical JSON shape for the current queried post).

### Field Normalization Guarantees (by `defineEditable()` field type)
Every field in `fields` is normalized identically for REST and Native hydration, reusing `forgewp_get_meta_value()` / `forgewp_get_repeater_field()` rules and falling back to the schema `default` when WordPress meta is empty (`null`, `false`, `""`, or `[]`):

| Field Type | Normalized JSON Type | Resolution & Fallback Rules |
|---|---|---|
| `text`, `color`, `url`, `select`, `icon` | `string` | Trimmed/raw scalar value from ACF `get_field()` or `get_post_meta()`; falls back to schema `default` (or `""`). |
| `richText` | `string` (HTML) | Non-empty string passed through `wpautop()` (matching `forgewp_get_meta_value(..., true)`); empty falls back to schema `default` (or `""`). |
| `number` | `number` | Numeric cast (`int`/`float`); empty/non-numeric falls back to schema `default` (or `0`). |
| `boolean` | `boolean` | `'1'`, `1`, `true`, `'true'` → `true`; `'0'`, `0`, `false`, `'false'` → `false`; unset (`""` / `null`) falls back to schema `default` (or `false`). |
| `image` | `EditableImageContract \| null` | Resolves ACF image array (`url`, `alt`, `width`, `height`, `srcset`), attachment ID (`wp_get_attachment_image_src()`), or URL string into `{ id?, url, alt, width?, height?, srcset? }`; empty/missing returns schema `default` image object (if URL string, `{ url, alt: "" }`) or `null`. |
| `repeater` | `Array<Record<string, unknown>>` | Reads rows via `forgewp_get_repeater_field()` order: (1) ACF `get_field()`, (2) ACF flat indexed meta `{key}_{i}_{subkey}`, (3) `{key}_json_fallback`, (4) raw JSON in `{key}`. Each subfield is recursively normalized by its declared schema subfield type. When 0 rows exist in WordPress, falls back to schema `default` rows (or `[]`). |

### Password-Protected Posts
- Matches §10 (`posts`): a password-protected published post returns `200 OK` with `"protected": true` and `"fields": {}` (no meta or repeater rows leaked).

### Response JSON (`GET /wp-json/forgewp/v1/editables?path=/about/` — `200 OK`)

```json
{
  "postId": 15,
  "postType": "page",
  "routeId": "about",
  "path": "/about/",
  "lang": "en",
  "schema": "about",
  "protected": false,
  "fields": {
    "hero_title": "About Our Studio",
    "hero_intro": "<p>We build dual-mode WordPress sites with React.</p>\n",
    "show_team": true,
    "founded_year": 2021,
    "hero_image": {
      "id": 88,
      "url": "https://wp.example.com/wp-content/uploads/studio.jpg",
      "alt": "Studio team",
      "width": 1600,
      "height": 900
    },
    "team_members": [
      {
        "name": "Ada Lovelace",
        "role": "Engineering Lead",
        "avatar": {
          "id": 91,
          "url": "https://wp.example.com/wp-content/uploads/ada.jpg",
          "alt": "Ada"
        }
      }
    ]
  }
}
```

### Error Cases
- `400 FORGEWP_EDITABLES_TARGET_REQUIRED` — none of `path`, `routeId`, or `post` was provided.
- `404 FORGEWP_POST_NOT_FOUND` — target does not resolve to a published public post/page.
- `404 FORGEWP_LOCALE_NOT_FOUND` — explicit `?lang=<unknown>` per Amendment 3.

### React / Next.js Consumer (`@forgewp/react`)
- `wpClient.getEditables(target)`: fetches `/wp-json/forgewp/v1/editables` in decoupled mode (tagged `['editables', ...]`) or reads local mock `meta` / `fixtures` in fixture mode.
- `getWpEditable(schema, sourceOrClient)` / `wpClient.getEditable(schema, target)`: resolves typed editable fields including `repeater` arrays (`Array<Record<string, ...>>`) in decoupled mode instead of falling back to defaults.
- `useWpMeta()` and `<WpRepeater>` read from `ForgeWpRuntime` (`resources.editables` in native hydration or `restSource` in decoupled mode), preserving full parity between Native PHP `forgewp_get_repeater_field()` and Decoupled React rendering.

### Questions for Claude (R5)
1. **Schema manifest & matching:** Today `cms/editables/*.ts` schemas are imported by pages/blocks (`buildPageEditable`, `defineEditable`) and compiled for `register_post_meta()` / ACF registration. Does the compiler already collect a unified field-type map per template/post-type that we can emit into the Companion backend, or should `schema` name be derived from the editable filename + `cms/editables` export?
2. **Repeater `image` subfield shape:** In `forgewp_get_repeater_field()` (`packages/compiler/lib/functions/index.js:1339`), image subfields are flattened to a URL string (`$sub_val = $sub_val['url']`) for `<WpImage>` / `forgewp_resolve_image_source()`. In JSON, do you prefer normalized image objects `{ id?, url, alt, ... }` for `image` fields (with React helpers accepting both `{ url }` and `string`), or URL strings for `image` subfields?
3. **Unknown `schema` param:** If `?schema=nonexistent` is passed explicitly, should it return `404 FORGEWP_EDITABLE_SCHEMA_NOT_FOUND` or `200` with `fields: {}`? (Draft assumes `404` when an explicit unknown `schema` is requested, and `200` with `fields: {}` when a valid post simply has no editable schema attached.)
