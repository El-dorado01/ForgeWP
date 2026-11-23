# ForgeWP Dual-Mode Portability Architecture & Plugin Strategy

**Status:** Proposed Architecture & Review Brief (prepared for multi-agent and founder review)  
**Reviews:** Sections 1–7 = original brief (Gemini). Section 8 = second review & structural proposal (Claude), with answers to §6 open questions. Both kept side-by-side for founder decision.  
**Tracks:** [Next.js Adapter & Improvement Brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md) · Builds on [Unified WordPress Deployment Architecture](archive/ForgeWP_Unified_Deployment_Architecture.md)  
**Purpose:** Establish the architectural ruleset, codebase portability audit, WordPress plugin strategy, and infrastructure assumptions required so a future **ForgeWP Cloud / Infra platform** can honestly offer low-friction, preflight-verified switching between **Native WordPress**, **Hybrid**, and **Pure Decoupled** deployments from one repository.

---

## 1. Executive Framing: The "One-Click Mode Switch" Promise & Its Real Threat

"Push your repo once and switch between Native WordPress and Decoupled Next.js in one click" is an extraordinary platform wedge. However, promising that **any WordPress site + any third-party WordPress plugin** will switch blindly into a Pure Decoupled Next.js runtime with zero friction is a trap — and is where prior headless WordPress platforms have repeatedly hit a wall.

The friction is real and runs in **both directions**:
- **Decoupled -> Native:** App Router server-only capabilities (`middleware.ts`, Route Handlers, Server Actions, `next/headers`, catch-all dynamic routes) cannot run inside static/PHP WordPress templates.
- **Native -> Decoupled:** First-party ForgeWP hooks/components designed primarily around `window.forgeWpHydration` or compile-time PHP markers silently fall back or no-op in decoupled mode, AND third-party WordPress plugins that render via PHP shortcodes, `the_content` filters, theme hooks, or `wp_enqueue_script()` cannot execute inside a standalone Node/Edge React runtime.

### The Honest, Defensible Promise ForgeWP Can Actually Deliver

Instead of over-promising magic compatibility for arbitrary PHP plugins inside Pure Decoupled mode, ForgeWP's unique compiler architecture lets us make three concrete promises we *can* guarantee:

1. **First-Party Dual-Mode Parity:** Every ForgeWP-owned primitive (content, menus, routes, options, editables, Native Forms, Auth, WooCommerce, i18n, SEO, media) shares one backend REST + metadata contract across both Native WP and Decoupled frontends — never "native-only by accident."
2. **Bidirectional Preflight Certainty (`forgewp doctor`):** Before any deployment switch runs, a deterministic preflight gate audits both codebase primitives and active WordPress plugins, classifying blockers upfront rather than deploying a silently broken site.
3. **A 3-Mode Deployment Spectrum (`Native` <-> `Hybrid` <-> `Pure Decoupled`):** Because ForgeWP compiles a **matching Native WordPress theme** *and* a **Decoupled Next.js app** from the **exact same React codebase**, routes pinned to heavy WordPress plugins do not have to break a decoupled switch. An edge router in Hybrid mode can serve fast decoupled pages by default and delegate plugin-heavy routes back to the visually identical compiled WordPress theme.

---

## 2. Full-Framework Feature-by-Feature Portability Audit

Below is the observed state of every major ForgeWP subsystem today and the specific friction blocking frictionless mode switching.

### Summary Matrix

| Subsystem | Native WP Behavior (Today) | Current Decoupled State | Switching Friction | Target Tier |
|---|---|---|---|---|
| **Server Content (`createWpServerClient`)** | Emits PHP compile tokens (`getLivePage`, `getOption`, `getField`) | Fetches `wp/v2/*` & `forgewp/v1/routes\|menus\|site-info` | `getOption()` / `getField()` are sync token-only; no async WP REST fetch (`packages/react/src/server.ts`) | **Tier 1 (Portable)** after closing gaps |
| **Editables, Repeaters & Meta** | Hydrated from post meta + ACF `get_field()` + `forgewp_get_repeater_field()` | Read from fixture/plain meta in `getWpEditable()`; repeaters fall back to defaults | Missing normalized editable/ACF/repeater REST endpoint; `getWpEditable(schema, wpClient)` returns defaults for repeaters (`server.ts:1175-1177`) | **Tier 1 (Portable)** after REST bridge |
| **Gutenberg Blocks & `BlockArea`** | Native `the_content()` / `do_blocks()` executes PHP & assets | `parseSerializedBlocks()` parses core/ForgeWP blocks via `wp-json` (`next-decoupled-transport.js`) | Third-party dynamic PHP blocks (`render.php` / frontend `viewScript`) degrade or lack JS/CSS in React | **Tier 1** (Core/ForgeWP blocks) / **Tier 3 or Hybrid** (3rd-party PHP blocks) |
| **Site Options & Theme Mods** | PHP injects `window.forgeWpHydration.siteSettings` (`hydration-enqueuer.js:166-173`) | Only `/forgewp/v1/site-info` exists (`functions/index.js:1877`) | Missing public `/forgewp/v1/site-settings` endpoint for `useWpOption()` & `useWpThemeMod()` | **Tier 1 (Portable)** after REST bridge |
| **Native Forms (`defineWpForm`, `submitWpForm`)** | Submits to `/forgewp/v1/forms/<name>/submit`; injects `fieldLabels`/`fields` into hydration | `isProductionForms()` checks `window.forgeWpHydration?.restUrl` only — silently runs dev mock! (`hooks.ts:263-267`) | Missing `GET /forgewp/v1/forms/<name>` read endpoint; no CORS rules in `forms.js`; rate limit uses `REMOTE_ADDR` (`forms.js:584,1031`) | **Tier 1 (Portable)** after closing gaps |
| **Shortcode Forms & Shortcodes (`<WpShortcode>`)** | Compiles to `<?php echo do_shortcode(...); ?>` + plugin assets | Renders grey dev preview card (`WpShortcode.tsx:13-23`) | Plugin JS/CSS/nonces/AJAX/CAPTCHA require WordPress page lifecycle | **Tier 3 (Native-Pinned)** or **Hybrid Route** |
| **Authentication & Route Guards (`@forgewp/auth`, `WpServerRequireAuth`, `WpServerAuthGate`)** | Same-origin cookies + `wp_rest` nonce + PHP `is_user_logged_in()` / `current_user_can()` | Client auth supports JWT + `FORGEWP_FRONTEND_ORIGIN` (`rest-endpoints.js:754`); server guards pass `children` through without checking (`server.ts:1044-1121`) | Cross-origin `SameSite` cookie restrictions; decoupled `WpServerRequireAuth`/`WpServerAuthGate` & `pageConfig.protected` un-enforced | **Tier 2 (Infra-Bridged)** + server guard implementation |
| **WooCommerce (`@forgewp/woocommerce`)** | Same-origin WooCommerce session cookies + 18 `forgewp/v1` REST routes + PHP hooks | Reads `FORGEWP_API_URL` / `NEXT_PUBLIC_WP_API_URL` (`woocommerce/src/hooks.ts:9-32`) + `forgewp/v1` REST (`rest-endpoints.js:1615-1767`) | Cross-origin session cookies + 3rd-party checkout/payment plugins hooking WP PHP actions | **Tier 2** (ForgeWP Store API) / **Hybrid** (plugin checkout extensions) |
| **i18n & Languages (`useWpI18n`, `useWpLanguage`)** | PHP injects `window.forgeWpTranslations` + Polylang/WPML/local routing (`hydration-enqueuer.js:188-251`) | Hardcoded `'de'` default fallback in `hooks.ts:1889,1915` when hydration absent | Missing `/forgewp/v1/i18n` endpoint + Next.js locale middleware/routing parity | **Tier 1 (Portable)** after REST bridge |
| **SEO & Head Metadata (`@forgewp/plugin-seo`, `<SEO>`, Yoast/Rank Math)** | `forgewp_seo_plugin_active()` yields `<head>`; PHP merges JSON-LD via `wpseo_schema_graph` / `rank_math/json_ld` (`functions/index.js:99-140`) | Client/Vite `WpHead` renders JSX meta tags (`WpHead.tsx:38-60`); Next uses metadata/extractors | WP SEO plugins run in PHP; decoupled Next.js needs Yoast/Rank Math REST bridge + domain canonical rewriting | **Tier 2 (Infra-Bridged)** via `/forgewp/v1/seo` + proxy |
| **Routing, Queries, Previews & Cache Revalidation** | `forgewp_route_id` DB resolution (`routing.js:146-151`); live DB reads; native `?preview=true` | `/forgewp/v1/routes` & `/menus/:location` + `/query-<id>` (`rest-endpoints.js:238`, `functions/index.js:1761-1855`) | CMS vs public domain link rewriting; Draft Mode bridge; publish webhooks -> `revalidateTag`/`revalidatePath` | **Tier 2 (Infra-Bridged)** |
| **Assets, Media, Fonts & Icons (`WpImage`, `resolveWpAsset`, `WpIcon`)** | Bundles static assets into theme ZIP; PHP SVG icon map (`routing.js:13`) | Next uses `next/image` + CDN `/public`; `resolveWpAsset()` returns relative path when `forgeWpHydration.themeUri` absent (`hooks.ts:591-614`) | WP media `remotePatterns`; consistent base URL resolution across Vite/Next/WP | **Tier 1 (Portable)** with env/config conventions |
| **Server PHP & Hydration (`src/server/*.php`, `<Hydrate>`)** | `<Hydrate>` selectively hydrates islands; `src/server/*.php` appended to `functions.php` (`generate-theme.js:2041-2058`) | Full React hydration on Next; `src/server/*.php` lost unless running on WP | Backend `src/server/*.php` logic must survive switching off the Native WP theme | **Tier 1** (Backend via Companion Plugin) / **Tier 3** (if hooking template HTML) |
| **Next.js Server Features (`middleware.ts`, `route.ts`, `"use server"`, `next/headers`, `[...slug]`)** | Blocked cleanly by `diagnoseNextNativeCompatibility()` (`next-adapter.js:157-268`) | Native Next.js runtime execution | Cannot exist in static PHP export | **Tier 3 (Decoupled-Pinned)** |

### Deep-Dive Notes on Key Gaps Observed in the Source

1. **Native Forms Decoupled Blind Spot (`packages/react/src/hooks.ts` & `packages/compiler/lib/functions/forms.js`):**
   - `submitWpForm()` relies exclusively on `isProductionForms()` (`hooks.ts:263-267`) which checks `window.forgeWpHydration?.restUrl`. Outside a WordPress-rendered HTML document, `submitWpForm()` silently runs its dev simulation (`{ ok: true, message: 'Simulated (dev)' }`) instead of returning a configuration error or posting to WordPress.
   - `useWpFormFieldLabels()` (`hooks.ts:412-417`) and `<WpFormFields>` read from `window.forgeWpHydration?.forms?.[form]`. No `GET /wp-json/forgewp/v1/forms` or `/forms/<name>` schema endpoint is generated in `forms.js:2709-2721`.
   - `forms.js` does not honor `FORGEWP_FRONTEND_ORIGIN` / CORS headers the way Auth does (`rest-endpoints.js:753-755`), and its rate limiter uses `$_SERVER['REMOTE_ADDR']` directly (`forms.js:584,1031`), which collapses all users behind a Next.js BFF proxy into one 5-request bucket unless trusted edge/BFF forwarding is supported.

2. **Server Component Data & Auth Guards (`packages/react/src/server.ts`):**
   - `createWpServerClient()` already implements async decoupled REST fetching for `getPage`, `getLivePage`, `getPosts`, `getLivePost`, `getRoutes`, `getMenu`, and `getSiteInfo`.
   - However, `getOption()` and `getField()` (`server.ts:134-135`) remain synchronous compile-token/static-map helpers rather than resolving live WP options/meta over REST, and `getWpEditable()` explicitly skips live repeater hydration for `WpServerClient` (`server.ts:1175-1177`).
   - `WpServerRequireAuth` (`server.ts:1044-1059`) and `WpServerAuthGate` (`server.ts:1076-1121`) emit PHP guards during `FORGEWP_NATIVE_EXPORT=1` and otherwise return `children` directly — leaving protected Next.js routes/blocks unguarded in decoupled mode unless developers hand-write custom checks.

3. **Backend Contract Coupled to Theme Activation (`packages/compiler/lib/generate-theme.js` & `packages/compiler/lib/functions/`):**
   - Today, CPTs, meta registrations, Forms REST + `forgewp_submission` CPT, Auth REST, WooCommerce REST, `/forgewp/v1/routes|menus|site-info`, query endpoints, and `src/server/*.php` all live inside the exported theme's `functions.php`.
   - Switching a live site from Native WordPress to Decoupled Next.js currently risks turning off those backend contracts if the active WP theme is replaced by a minimal headless theme — directly tying into the **Companion WordPress plugin export** workstream already identified in [the improvement brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md#L71-L79).

4. **Non-Next.js Legacy Decoupled Surface (`packages/react/src/hooks.ts`):**
   - `useWpOption()`, `useWpThemeMod()`, `useWpI18n()`, `useWpLanguage()`, `useWpQuery()`, `useWpMenu()`, and `resolveWpAsset()` in client hooks were primarily built for Vite/theme hydration globals (`window.forgeWpHydration`, `window.forgeWpTranslations`) rather than runtime fetching against an external WP origin or Next.js Server Component props. Even the i18n default fallback in `hooks.ts:1889,1915` hardcodes `'de'` when globals are absent.

---

## 3. The WordPress Plugin Compatibility Problem (Deep Dive & Strategy)

This is the single biggest strategic risk to the "one-click switch" promise. WordPress's main reason for existing in real client projects is its **plugin ecosystem** (forms, bookings, memberships, LMS, events, payments, SEO, multilingual, directories). Most third-party plugins were written assuming WordPress owns the HTML `<head>`, `the_content()`, `wp_footer()`, shortcodes, nonces, and `admin-ajax.php`.

Trying to pretend arbitrary WP plugins run natively inside Pure Decoupled React will fail in production. Instead, we solve this cleanly across **four layers**:

### Step 1 — Classify WordPress Plugins into 4 Clear Behavioral Categories

| Category | Examples | Native WP | Pure Decoupled | Hybrid Mode | Why / Required Mechanism |
|---|---|---|---|---|---|
| **A. Backend / Data / Ops / SEO / Cache** | ACF / SCF, Meta Box, Yoast SEO, Rank Math, Polylang / WPML, WP Mail SMTP, Redis Cache, Redirection, User Role Editor, Offload Media | Works | **Works** | Works | Runs in wp-admin/PHP/DB/REST; only metadata/canonical bridges needed (`/forgewp/v1/seo`, normalized ACF meta) |
| **B. API-Capable Business Plugins (with Adapters)** | WooCommerce (core catalog/cart), Gravity Forms REST, WPForms, EDD, SearchWP/Algolia | Works | **Works (scoped)** | Works | Requires ForgeWP first-party or official plugin REST adapters; advanced checkout/field add-ons may fall into Category C |
| **C. Frontend-Injecting / Shortcode / PHP-Hook Plugins** | Contact Form 7, Ninja Forms, Booking/Calendar/Directory/Forum plugins, popup/cookie banners, WC 3DS/subscription checkout extensions, dynamic PHP Gutenberg blocks | Works | **Broken natively** | **Works seamlessly** | Enqueues JS/CSS via `wp_enqueue_script`, depends on WP page nonces, inline HTML injection, or `admin-ajax.php` |
| **D. Full-Site Visual Page Builders** | Elementor Pro Theme Builder, Divi, Bricks (when taking over templates) | Conflicts with ForgeWP React templates | **Incompatible** | Limited / Discouraged | Replaces the React presentation layer altogether; flagged as outside ForgeWP's React authoring model |

### Step 2 — Four Concrete Solutions for Category C Plugins

#### Solution 1 — The 3-Mode Deployment Spectrum (Hybrid Route Delegation = ForgeWP's Moat)

Rather than forcing a binary choice between **Native WP** and **Pure Decoupled**, ForgeWP Infra should treat deployment as a **3-mode slider** backed by one repository:

1. **Mode 1 — Native WordPress:**
   100% compiled PHP theme (`forgewp export`). Maximum compatibility with **all** Category A/B/C plugins.
2. **Mode 2 — Hybrid (Decoupled Default + Native Plugin Routes):**
   Because ForgeWP compiles *both* a Next.js server build **and** a visually matching Native WordPress theme from the **exact same React components, Tailwind styles, `<Header>`, `<Footer>`, menus, and CSS variables**, a single same-domain edge router can:
   - Serve marketing pages, blog/CPTs, listings, and custom Next.js routes from the **Decoupled Next.js edge/Node runtime**.
   - Transparently proxy plugin-dependent routes (e.g., `/checkout`, `/booking`, `/contact-cf7`, `/events`, `/member-portal` declared via `hybridRoutes`) to the **compiled Native WordPress theme** on the exact same public origin!
   - Visitors keep the exact same visual shell, navigation links (`<a>`), and **same-domain WordPress session cookies** with zero jarring domain jump.
   *(Note why pure headless platforms like Faust.js, Astro, or standalone Next.js cannot do this easily: maintaining visual parity in a separate hand-written PHP theme doubles the frontend codebase. ForgeWP gets the matching PHP theme free from its compiler.)*
3. **Mode 3 — Pure Decoupled:**
   100% Next.js frontend + ForgeWP Companion Backend Plugin on WordPress. Unlocked cleanly whenever preflight detects zero Category C/D frontend dependencies.

#### Solution 2 — Opt-In Same-Origin Isolated Embed Bridge (`/forgewp-embed`)

For cases where a team strongly prefers **Mode 3 (Pure Decoupled)** but has *one* isolated legacy widget (for example, a niche booking calendar or CF7 form embedded inside an otherwise decoupled page):
- ForgeWP Companion Plugin exposes a tightly scoped, signed minimal endpoint (e.g. `https://example.com/_wp-embed/shortcode?...` or page fragment) that renders **only** the shortcode + WordPress header/footer asset hooks inside a styling-matched, same-origin, auto-resizing iframe (`postMessage` height sync, CSP-locked to same origin).
- **Important guardrails:** Must be opt-in (`strategy: 'embed'`), never automatic/silent, with clear developer warnings about iframe UX trade-offs (SEO opacity, modal overflow limits, responsive boundaries).

#### Solution 3 — Automated Codebase + Live WP Plugin Compatibility Audit

Give developers and ForgeWP Cloud deterministic truth *before* switching modes:
- **Static project audit (`forgewp doctor --target native|decoupled|hybrid --json`):**
  Scans for Mode-Pinned constructs in user code:
  - Native-pinned: `<WpShortcode>`, `mode: 'shortcode'` forms, PHP-only template hooks in `src/server/*.php`.
  - Decoupled-pinned: `middleware.ts`/`proxy.ts`, `app/**/route.ts`, `"use server"`, `next/headers`, `force-dynamic`, catch-all `[...slug]`.
- **Live WP site audit (via authenticated Companion Plugin endpoint `GET /wp-json/forgewp/v1/system/compatibility`):**
  1. Inspects `get_option('active_plugins')` against a curated, versioned **ForgeWP Plugin Compatibility Registry** (mapping well-known slugs like `contact-form-7`, `wordpress-seo`, `advanced-custom-fields`, `woocommerce`, `elementor` to Categories A/B/C/D + recommended mode/migration).
  2. Performs runtime hook heuristics for **unknown/custom plugins**: detects non-ForgeWP active callbacks on `the_content`, registered third-party shortcodes referenced in published post content, and public-only `wp_enqueue_script` / `wp_head` injections from unknown plugin directories.
  3. Produces an actionable preflight card in CLI / ForgeWP Cloud UI:
     - *Example:* `"Pure Decoupled blocked by 2 active plugin dependencies: Contact Form 7 (pages: /contact) & WooCommerce Stripe Gateway (page: /checkout). Recommendation: Switch to Hybrid Mode (keeps 18 pages Decoupled, routes /contact & /checkout to your identical compiled Native theme), or migrate /contact to ForgeWP Native Forms."`

#### Solution 4 — First-Party Dual-Mode Primitives Covering the Top 80% of Site Needs

Most agencies install frontend WP plugins for a small set of recurring jobs: forms, auth/member gates, SEO/schema, commerce, multilingual routing, and structured repeaters/sliders. By keeping ForgeWP's own primitives **strictly dual-mode** (Native Forms instead of CF7, `@forgewp/auth` instead of random login plugins, `@forgewp/plugin-seo` + REST bridge instead of custom head PHP, `@forgewp/woocommerce` Store API for standard storefronts), ~80% of sites never touch Category C plugins in the first place.

---

## 4. Core Architectural Pillars for ForgeWP & Future Infra

### Pillar 1 — Split the WordPress Backend Contract from the Presentation Theme (Companion Plugin)

Currently in [generate-theme.js](../packages/compiler/lib/generate-theme.js) and [packages/compiler/lib/functions/](../packages/compiler/lib/functions/), WordPress backend behavior is bundled into `functions.php` inside the active theme. To support 1-click switching cleanly, extract a **ForgeWP Companion Backend Plugin** (aligning directly with the [Companion WordPress plugin export brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md#L71-L79)):

| Belongs in Companion Backend Plugin (Always Active in Native, Hybrid & Decoupled) | Belongs in Presentation Layer (Swapped Between Native Theme vs. Next.js) |
|---|---|
| CPTs & Taxonomies (`cms/post-types`, `forgewp_submission`) | PHP template files (`front-page.php`, `page-*.php`, `single-*.php`, `archive-*.php`) |
| Meta / Editable / Repeater / ACF field registrations & REST serializer | Compiled Tailwind CSS, route-scoped CSS, static theme images/fonts |
| Native Forms REST handlers, validation, `wp_mail`, wp-admin Inbox & field editor | `<Hydrate>` island bundle enqueuing & PHP render markup replacements |
| `@forgewp/auth` REST endpoints, settings, session/JWT handling | Next.js App Router SSR / ISR / client runtime (`output: 'standalone'` vs `output: 'export'`) |
| `@forgewp/woocommerce` `forgewp/v1/*` cart/checkout/customer REST routes | Presentation-only theme hooks (`wp_head` asset tags, body classes, scripts) |
| Core bridge REST (`/forgewp/v1/routes`, `/menus`, `/site-info`, `/site-settings`, `/forms`, `/i18n`, `/seo`, `/blocks`) | |
| Content-change revalidation webhooks & Draft Mode preview redirector | |
| Backend `src/server/*.php` API/CPT/cron logic (`src/server/backend/*.php` or marked backend-safe) | |

### Pillar 2 — Same-Domain Edge Router Architecture (ForgeWP Infra)

In self-hosted setups where WordPress lives on `cms.domain.com` and Next.js lives on `www.domain.com`, cross-origin friction hits Auth cookies (`SameSite=Lax`), REST nonces, CORS preflights, rate-limit client IPs, SEO canonicals, and form submissions.

On **ForgeWP Cloud / Infra**, placing a lightweight edge reverse proxy in front of both origins eliminates ~80% of that friction:

```text
                    https://example.com (Public Domain)
                                    │
                        ForgeWP Edge Router / Proxy
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼ (Always WP Origin)        ▼ (Mode = Native            ▼ (Mode = Decoupled
 /wp-admin/*                          OR path in                   OR path not in
 /wp-login.php                        hybridRoutes[])              hybridRoutes[])
 /wp-json/*                                                     │
 /wp-content/uploads/*              │                           │
 /_wp-embed/*                       ▼                           ▼
                              WordPress Origin           Next.js Origin
                            (Compiled Native           (Edge / Node Server +
                             Theme + Companion          Companion Plugin API)
                                 Plugin)
```

Benefits of same-domain edge routing:
1. **Zero CORS / Zero third-party cookie failures:** Auth cookies (`wordpress_logged_in_*`), REST nonces, and WooCommerce session cookies stay first-party same-origin.
2. **Instant, zero-DNS rollback & mode switching:** Switching `Native <-> Hybrid <-> Decoupled` is an edge routing table change + atomic Next/WP artifact activation — not a DNS propagation wait.
3. **Consistent `X-Forwarded-For` / Real-IP trust:** ForgeWP's proxy injects a platform-verified edge secret + client IP header, solving the `REMOTE_ADDR` rate-limit collapse in [forms.js](../packages/compiler/lib/functions/forms.js#L584) and [rest-endpoints.js](../packages/compiler/lib/functions/rest-endpoints.js#L728).
4. **Enables Hybrid Mode transparently:** `/checkout` or `/booking` routes hit the Native WP compiled theme under the exact same URL bar domain.

*(Self-hosted cross-origin decoupled installs outside ForgeWP Infra remain supported via `FORGEWP_WP_URL`, JWT auth, CORS allowlists, and `FORGEWP_FRONTEND_ORIGIN` — without breaking the framework outside ForgeWP Cloud.)*

### Pillar 3 — Unified 3-Tier Portability Contract & Bidirectional Preflight Schema

Every ForgeWP API, CLI feature, and config option MUST declare one tier:
- **Tier 1 — Portable Core:** Works identically in Native, Hybrid, and Pure Decoupled (even self-hosted).
- **Tier 2 — Infra-Bridged:** Works seamlessly in all modes behind ForgeWP Infra / documented proxy rules, or requires explicit decoupled config (`FORGEWP_FRONTEND_ORIGIN`, JWT, revalidation secret, `images.remotePatterns`) when self-hosted.
- **Tier 3 — Mode-Pinned:** Works only in a stated mode (unless bridged via Hybrid route delegation or explicit opt-in embed). Switching away triggers a preflight error or explicit confirmation gate.

**Target Machine-Readable Preflight Output (`forgewp doctor --target <mode> --json`):**

```json
{
  "targetMode": "decoupled",
  "compatible": false,
  "recommendedMode": "hybrid",
  "suggestedHybridRoutes": ["/contact", "/checkout"],
  "blockers": [
    {
      "code": "SHORTCODE_FORM_NATIVE_PINNED",
      "tier": 3,
      "source": "cms/forms/contact.ts",
      "affectedRoutes": ["/contact"],
      "message": "Form 'contact' uses mode: 'shortcode' (Contact Form 7).",
      "resolutions": ["switch_to_native_forms", "enable_hybrid_route", "use_embed_bridge"]
    }
  ],
  "warnings": [
    {
      "code": "FORMS_DECOUPLED_CORS_UNCONFIGURED",
      "tier": 2,
      "message": "Set FORGEWP_FRONTEND_ORIGIN or deploy behind ForgeWP same-domain proxy."
    }
  ]
}
```

### Pillar 4 — Mandatory "Dual-Mode Portability" Checklist in All Future Specs & PRs

No new framework feature should ship with an undocumented mode gap. Every spec or PR touching runtime, compiler output, REST endpoints, or React APIs should include:
1. **Portability Tier:** Tier 1 / Tier 2 / Tier 3 (`Native-pinned` or `Decoupled-pinned`).
2. **Runtime Contract in Both Modes:** Exact behavior in Native WP PHP, Decoupled Next.js SSR/CSR, and Vite/Next local dev.
3. **Doctor / Preflight Diagnostic:** If Tier 2/3, the exact `forgewp doctor` check added alongside the feature.

---

## 5. Phased Engineering Roadmap

### Phase 0 — Governance & Visibility (Now / Immediate)
- Adopt this Dual-Mode Portability Contract across specs (starting with [shortcode-form-preview-spec.md](shortcode-form-preview-spec.md)).
- Extend `forgewp doctor` with `--target native|decoupled|hybrid` and `--json` output, symmetrically scanning **Native -> Decoupled** blockers (`<WpShortcode>`, `mode: 'shortcode'`, `useWpQuery`/`useWpMeta` caveats, raw PHP hooks) alongside existing `diagnoseNextNativeCompatibility()`.

### Phase 1 — Close First-Party Dual-Mode Runtime Gaps
Make every first-party primitive genuinely Tier 1 / clean Tier 2 across both Next.js and WordPress:
1. **Native Forms Dual-Mode Contract:**
   - Add public `GET /wp-json/forgewp/v1/forms` & `/forms/<name>?lang=...` returning sanitized `clientFields`, `fieldLabels`, and non-secret field definitions.
   - Update `submitWpForm()`, `useWpFormFieldLabels()`, `<WpFormFields>`, and `createWpServerClient()` (`getForm(name)`) to work cleanly in decoupled mode without `window.forgeWpHydration` — distinguishing "explicit decoupled WP URL missing vs. local dev simulation" so production never silently logs `"Simulated (dev)"`.
   - Support `FORGEWP_FRONTEND_ORIGIN` / trusted proxy forwarding on Forms REST endpoints matching `@forgewp/auth`.
2. **Unified Read Bridges on WP:**
   - Add `/wp-json/forgewp/v1/site-settings` (exposing registered options & theme mods for `useWpOption` / `useWpThemeMod` / `wpClient.getOption()`), `/wp-json/forgewp/v1/i18n`, `/wp-json/forgewp/v1/seo?path=...` (Yoast `yoast_head_json` / Rank Math headless adapter + ForgeWP metadata), and normalized post editable/ACF/repeater payloads (closing the `getWpEditable(schema, wpClient)` repeater gap in [server.ts](../packages/react/src/server.ts#L1175-L1177)).
3. **Decoupled Server Auth Enforcement:**
   - Wire `WpServerRequireAuth`, `WpServerAuthGate`, and `pageConfig.protected` in Next.js Decoupled mode to verify WordPress session cookies/tokens via `/forgewp/v1/auth/me` (passing request `cookies()` cleanly inside a Server Component helper) rather than rendering protected `children` unconditionally.

### Phase 2 — Extract the Backend Contract (Companion Plugin + Sync)
- Implement **Companion WordPress Plugin Export** per [the improvement brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md#L71-L79), emitting all ForgeWP backend runtime contracts (`register_post_type`, meta schemas, Forms, Auth, WooCommerce REST, `/forgewp/v1/*`, and `src/server/*.php` backend modules) independently of the presentation theme.
- Add automatic **Revalidation Webhooks** (`save_post`, `wp_update_nav_menu`, `update_option` -> signed `POST /api/forgewp/revalidate`) and **WP Preview -> Next Draft Mode** redirect support.

### Phase 3 — Hybrid Mode & Platform Preflight (`ForgeWP Infra`)
- Add optional `hybridRoutes` / route classification output in compiler manifests so ForgeWP Infra can dual-build both artifacts from one repo and route plugin-bound URLs to Native WP transparently.
- Ship `GET /wp-json/forgewp/v1/system/compatibility` inside the Companion Plugin + an initial curated Plugin Compatibility Registry covering the top 30–50 WordPress ecosystem plugins.
- Standardize same-domain edge proxy headers (`X-ForgeWP-Mode`, `X-ForgeWP-Proxy-Secret`, client IP verification, same-origin `/_wp-embed` framing).

---

## 6. Open Questions & Stress-Test Prompts for Second-Agent Review

Please review and stress-test these specific design trade-offs with another agent before locking Phase 1–3 implementation tickets:

1. **Is Hybrid Mode worth dual-building in CI, or should v1 Cloud launch as strict Native <-> Pure Decoupled first?**
   *Trade-off:* Hybrid solves Category C plugins cleanly and differentiates ForgeWP from Faust.js/headless hosts, but requires ForgeWP Infra to build & deploy *both* the WP theme ZIP and Next.js server artifact per commit and manage mixed cache/edge invalidation rules. Should Hybrid be Phase 3, or core to day-one infra?
2. **How should `src/server/*.php` be split cleanly between Companion Plugin vs. Presentation Theme?**
   *Concrete risk:* User files in `src/server/*.php` currently append straight into theme `functions.php` (`generate-theme.js:2041-2058`). Some scripts register REST routes/CPTs (needed in Decoupled mode), while others hook `wp_head` or `body_class` (presentation-only). Should we introduce folder convention `src/plugin/*.php` vs `src/theme/*.php`, or header annotations?
3. **Session & Auth portability under Self-Hosted Cross-Origin Decoupled vs. Infra Same-Domain Proxy:**
   *Question:* If a self-hosted dev switches from Native (cookies) to cross-origin Decoupled (`app.site.com` + `wp.site.com`), `WpServerRequireAuth` in Next Server Components can only read cookies set on `app.site.com`. Should ForgeWP enforce same-domain/BFF cookie bridging for SSR auth guards, or issue a Next-origin signed session/JWT alongside WP REST?
4. **`WpFormFields` & `useWpForm` decoupled hydration architecture (CSR vs. RSC):**
   *Question:* Right now `<WpFormFields form="contact" />` renders compile-time PHP loops inside WordPress, whereas decoupled Next Server Components want async fetching via `wpClient.getForm('contact')` (or SSR props) + progressive enhancement before client JS hydrates. What is the cleanest ergonomic API so developer React JSX stays 100% identical across both?
5. **Strictness of `forgewp doctor --target decoupled` on `<WpShortcode>` / `mode: 'shortcode'`:**
   *Question:* Should `<WpShortcode>` be a hard **error** (`compatible: false`) for Pure Decoupled (unless opted into Hybrid route delegation or `strategy: 'embed'`), or a **warning**? Silent degradation in production is dangerous — where should the hard block sit?
6. **Live Plugin Compatibility Registry maintenance & false positives:**
   *Question:* Any static slug list (`contact-form-7`, `wpforms-lite`, etc.) ages quickly. How much weight should live runtime hook inspection (`has_filter('the_content')`, shortcode usage scan in `wp_posts`, unknown public `wp_enqueue_script`) carry relative to a curated registry?
7. **Legacy Vite React adapter (`frameworkAdapter: 'react'`) vs. Next.js App Router adapter (`frameworkAdapter: 'nextjs'`):**
   *Question:* Client hooks in `packages/react/src/hooks.ts` (`useWpOption`, `useWpQuery`, `useWpI18n`, `resolveWpAsset`) still power the Vite SPA/theme adapter while `packages/react/src/server.ts` powers Next.js RSC. Should Dual-Mode Infra one-click switching target **Next.js App Router first**, or also bring Vite SPA decoupled mode up to the same REST contract?

---

## 7. Industry Precedents & Future Convergence

### 7.1 What Is Permanently Blocked vs. Where Smooth Dual-Mode Will Converge

Dual-mode portability splits cleanly into a permanent runtime boundary for legacy PHP plugins and a high-leverage path forward for modern primitives:

- **Permanent runtime boundary (physics, not a tooling bug):** Legacy WordPress plugins that echo PHP HTML through `the_content`, enqueue scripts via `wp_enqueue_script()`, inject inline markup into `wp_head` / `wp_footer`, and post to `admin-ajax.php` with page-bound nonces cannot execute natively inside a standalone Node/Edge JS runtime without running PHP somewhere. Hybrid route delegation plus deterministic preflight audits represent the honest architectural ceiling for that class of plugins.
- **Where smooth, portable dual-mode will genuinely converge:**
  1. **First-party ForgeWP primitives (~80% of typical sites):** Once Phase 1–2 close the remaining REST/auth bridges, isolate the Companion Backend Plugin, and pair with a same-domain edge router, apps built on ForgeWP primitives can switch **1-click Native <-> Pure Decoupled** cleanly.
  2. **WordPress Core evolution toward declarative/schema contracts:**
     - **Block Bindings API** moves dynamic fields out of bespoke PHP templates into declarative bindings.
     - **Interactivity API (`data-wp-*`)** replaces opaque `wp_footer` jQuery bundles with small declarative client stores tied to structured directives.
     - **Abilities API** introduces a standardized schema registry (inputs, outputs, permissions) of plugin capabilities callable directly by decoupled frontends and external agents without scraping PHP HTML.
  3. **Unified ForgeWP Build Output Manifest + per-route rendering declarations:** Extending routes/pages with an explicit or inferred `wpMode` (`'native' | 'decoupled'`) lets one intermediate manifest drive Native theme export, Pure Decoupled deployment, or Hybrid edge routing without rewriting user components.
  4. **PHP-in-WASM / WordPress Playground note:** Worth tracking over the long run, but too heavy and impedance-mismatched for arbitrary database-backed production plugins today — v1 infra should rely on real PHP + same-domain edge routing rather than WASM emulation.

### 7.2 Cross-Ecosystem Platform Precedents & Reusable Lessons

No mainstream platform currently compiles **one React/Next codebase** into **either a Native PHP monolith theme or a Decoupled JS app**, making that compiler pair unique to ForgeWP. However, five ecosystems have solved adjacent layers whose patterns ForgeWP and ForgeWP Infra should adopt directly:

| Platform / Ecosystem | How They Approach Dual / Hybrid Deployment | Direct Lesson for ForgeWP & ForgeWP Infra |
|---|---|---|
| **Shopify (Liquid <-> Hydrogen / Oxygen)** | Pairs monolithic Liquid themes with decoupled React storefronts (Hydrogen on Oxygen edge) backed by one commerce engine. | **Accept Hybrid boundaries openly.** Even Shopify hands `/checkout` back to Shopify rather than forcing arbitrary payment/tax extensions into headless code. Unlike Shopify — which forces teams to *rewrite* Liquid into React — ForgeWP generates both from one codebase. |
| **Cloudflare Workers Router & Vercel Microfrontends (`microfrontends.json`)** | Uses a single-domain edge router to dispatch paths between modern JS apps and legacy monoliths via service bindings/rewrites, Strangler Fig migrations, feature flags, and instant rollbacks. | **Exact blueprint for ForgeWP Cloud's edge router:** Serve `example.com` through one router dispatching `/wp-admin/*` and `/wp-json/*` to WP, `hybridRoutes[]` to the compiled Native WP theme, and remaining pages to Next.js — making mode switching an atomic routing flip. |
| **Astro (`static` / `server` / per-route `prerender`) & Nitro / OpenNext (Build Output API)** | Compiles one project into a standardized intermediate output and swaps runtime targets via presets/adapters, with per-page overrides and compile-time incompatibility diagnostics. | **Adopting a single Build Output Manifest:** Emit one platform-agnostic manifest with explicit per-route capabilities (`wpMode: 'native' | 'decoupled'`) and loud compile-time mode checks instead of treating Native and Decoupled as unrelated builds. |
| **Pantheon (`pantheon_decoupled` + Front-End Sites) & WP Engine Atlas (Faust.js)** | Unifies WordPress/Drupal CMS hosting and Next.js hosting with a CMS companion module managing cache invalidation, menu/content JSON APIs, and OAuth previews. | **Confirms the Companion Backend Plugin is mandatory** so APIs, previews, and cache webhooks stay intact across presentation switches — while avoiding Atlas's headless-only lock-in when sites need plugins or Native fallback. |
| **Drupal (Monolithic -> Progressively Decoupled -> Hybrid -> Fully Decoupled)** | Treats decoupling as a documented 4-stage spectrum rather than an all-or-nothing jump. | **Clarifies ForgeWP's positioning:** ForgeWP Native mode (`PHP templates + <Hydrate> React islands`) is already *Progressively Decoupled*, making the step into Hybrid or Pure Decoupled far smaller than migrating a traditional template monolith. |


---

## 8. Second Review & Structural Proposal (Claude)

> **Reading guide:** This section does not replace Sections 1–7. It agrees with the brief's diagnosis and strategic direction (Companion Plugin, Hybrid as moat, honest plugin boundary, `forgewp doctor`) but proposes a different *engineering order* and a structural fix aimed at the root cause rather than per-subsystem patches. Where the two disagree, both positions are stated so the founder can decide.

### 8.1 Verdict on the Original Brief

| Area | Assessment |
|---|---|
| Diagnosis (§2 audit) | **Accurate.** Spot-checked: `isProductionForms()` at `hooks.ts:263`, hardcoded `'de'` at `hooks.ts:1889-1916`, `src/server/*.php` appended into `functions.php` at `generate-theme.js:2041-2058`. |
| Honest promise / plugin categories (§1, §3) | **Agree.** Category C/D plugins are a runtime boundary, not a tooling bug. |
| Companion Plugin (Pillar 1) | **Agree, and it should move earlier** (see 8.4). |
| Same-domain edge router (Pillar 2) | **Agree.** It is needed for Pure Decoupled anyway (cookies, nonces, real IP), not only for Hybrid. |
| Tier contract + doctor JSON (Pillar 3) | **Agree,** but doctor should read a compiler-emitted manifest instead of grepping source (8.3.4). |
| PR checklist (Pillar 4) | **Necessary but insufficient.** Checklists drift; parity must be enforced by architecture, lint, and CI (8.3). |
| Embed bridge (Solution 2) | **Disagree / defer.** Iframe UX (modals, SEO, focus, resizing) becomes a permanent support burden; Hybrid routes cover the same need more cleanly. |
| Live plugin registry + hook heuristics (Solution 3) | **Infra-phase, not framework-now.** |
| "~80% of sites" claims | **Unvalidated estimates.** The two real client projects in this repo both use Category C plugins (see 8.5). Keep out of marketing copy until measured. |

### 8.2 Root Cause: Two Data Paths per Primitive

Almost every first-party primitive currently has **two independent data paths**:

- **Native:** PHP injects `window.forgeWpHydration` / `forgeWpTranslations`, or the compiler emits PHP tokens (`FORGEWP_NATIVE_EXPORT`).
- **Decoupled:** a REST fetch — or nothing, with a silent fallback.

At the time of review `packages/react/src` contains **16 direct reads of `forgeWpHydration`** and **18 `FORGEWP_NATIVE_EXPORT` branches**. Each is a place where a mode gap can appear. The forms dev-mock, the `'de'` fallback, the pass-through auth guards, and the repeater gap are all instances of this one pattern. Patching each subsystem (the brief's Phase 1) closes today's gaps but leaves the pattern in place, so every new feature can reintroduce one.

**Goal:** make switching modes a change of *transport*, never a change of *data shape or component code*.

### 8.3 Proposal: Five Structural Pieces

#### 8.3.1 Native hydration = a prefetched REST response

For every resource (site settings, menus, routes, forms, editables, i18n, SEO, `auth/me`, cart…), the PHP that writes the hydration payload emits **byte-for-byte the same JSON** that `GET /wp-json/forgewp/v1/<resource>` returns. Native mode becomes "Decoupled mode with the cache pre-filled by PHP".

```text
Native:     PHP render  ──► forgeWpHydration.resources['siteSettings'] = <JSON>  ─┐
                                                                                 ├─► same shape ─► hooks / RSC
Decoupled:  Next.js RSC ──► fetch /wp-json/forgewp/v1/site-settings     = <JSON> ─┘
```

#### 8.3.2 Single runtime data layer (`ForgeWpRuntime`) with pluggable sources

```ts
// conceptual
interface ForgeWpSource {
  get<R extends ResourceName>(resource: R, params?: ResourceParams<R>): Promise<ResourceData<R>>;
  peek<R extends ResourceName>(resource: R, params?): ResourceData<R> | undefined; // sync, for hydrated data
}
// sources: nativeSource (reads PHP-injected cache), restSource (fetches WP origin),
//          fixtureSource (local dev / tests)
```

- All client hooks (`useWpOption`, `useWpMenu`, `useWpI18n`, `useWpFormFieldLabels`, …) and `createWpServerClient()` go through this layer only.
- **Lint rule:** reading `window.forgeWpHydration` outside the native source is an error.
- **Fail loud:** in production, no resolvable source throws a typed configuration error. No silent mock (`'Simulated (dev)'`), no hardcoded locale. Dev fixtures are only allowed when `NODE_ENV !== 'production'` *and* explicitly selected.
- Explicit mode resolution (`FORGEWP_MODE=native|decoupled`, inferred by the adapter), never inferred from "does a global exist".

#### 8.3.3 One resource contract → generated PHP + TS

```ts
// conceptual
export const siteSettings = defineResource({
  name: 'siteSettings',
  route: '/site-settings',
  schema: { siteTitle: 'string', footerText: 'string', logo: 'image', ... },
  auth: 'public',
  cache: { tags: ['options'] },
});
```

The compiler generates from one definition: (1) the PHP REST route, (2) the PHP hydration injection, (3) TS types, (4) the typed client fetcher, (5) revalidation tags. Shipping a native-only feature then requires *opting out* of the contract instead of being the default.

#### 8.3.4 Compiler-emitted route capability manifest

The compiler already knows what each route touches. Emit it:

```json
{
  "routes": {
    "/contact": { "uses": ["form:contact", "shortcode:contact-form-7"], "pinned": "native" },
    "/blog/[slug]": { "uses": ["posts", "seo", "menus:primary"], "pinned": null },
    "/api/revalidate": { "uses": ["route-handler"], "pinned": "decoupled" }
  }
}
```

`forgewp doctor`, Hybrid route generation (`hybridRoutes`), and the Infra preflight all read this one file. It is also the "Build Output Manifest" the brief recommends in §7.2, and makes per-route `wpMode` a first-class output.

#### 8.3.5 Cross-mode parity tests in CI

Render the same fixture project in Native (via the new LocalWP e2e runner) and Decoupled (Next.js), then compare: (a) resource JSON payloads, (b) key DOM/text snapshots per route, (c) form submit, auth gate, and locale behavior. **A parity diff fails the build.** This makes "one click" a tested guarantee rather than a hope.

### 8.4 A Trap Not Covered by the Brief: Theme-Scoped State

WordPress stores theme mods **per theme** (`theme_mods_{stylesheet}`), and **`nav_menu_locations` is itself a theme mod.** If going Decoupled means activating a different (minimal/headless) WP theme, the site loses menu location assignments, `custom_logo`, `footer_text`, and all customizer values — although the database is unchanged.

The compiler currently relies on theme mods in several places: `functions/index.js:1065,1881`, `functions/routing.js:300-329,466-467`, `markup-processor.js:854-859`, `render-theme.mts:599`, plus `get_nav_menu_locations()` reads in `index.js` and `hydration-enqueuer.js`.

**Recommendation:** the Companion Plugin owns this state **in every mode**, including Native:
- Customizer settings registered with `'type' => 'option'` (already done for one setting at `theme-setup.js:346`) under a `forgewp_*` option namespace.
- Menu locations mirrored into a plugin-owned option and served back via the `theme_mod_nav_menu_locations` filter, so they survive theme swaps.
- One-time migration routine on plugin activation that copies existing `theme_mods_{slug}` values.

The theme becomes **presentation only**: templates, CSS, assets, island enqueuing. This also lets Native ↔ Decoupled switching keep the *same* WP theme active, or swap to a stub, without data loss.

### 8.5 Evidence From Existing Projects: `src/server/*.php` Is Mostly Presentation

Classification of every escape-hatch file in the repo today:

| File | Hooks | Belongs | Decoupled path |
|---|---|---|---|
| `hotelchecker24/mailpoet.php` | `rest_api_init` | **Plugin** | Works as-is |
| `hospitality/event-booking-fields.php` | Events Manager `em_*` hooks | **Plugin** (backend data) | Works for data; booking UI is Category C |
| `hospitality/event-booking-email-fields.php` | `em_booking_output_placeholder` | **Plugin** | Works |
| `hotelchecker24/redirects.php`, `hospitality/redirects.php` | `template_redirect` | **Neither — should be declarative** | `redirects` config → PHP + `next.config` + edge |
| `hotelchecker24/hreflang.php`, `og-fallback.php` | `wp_head` | **SEO contract** | `/forgewp/v1/seo` resource |
| `hotelchecker24/schemas.php` | `wp_head`, `rank_math/json_ld`, `wpseo_schema_graph` | **SEO contract** (filters → plugin) | `/forgewp/v1/seo` resource |
| `hotelchecker24/content-filters.php` | `the_content` | **Theme** (native-pinned) | Needs content-pipeline equivalent or Tier 3 flag |

**Findings:**
1. Only 3 of 9 files are pure backend. Most escape-hatch PHP exists to fill gaps in first-party primitives (redirects, head/SEO, hreflang). Each such pattern should graduate to a declarative, dual-mode primitive instead of staying as PHP.
2. Both real client projects use Category C plugins (Events Manager booking UI; MailPoet / Rank Math integration), so **day-one Infra customers like these cannot go Pure Decoupled without Hybrid.** This weighs on §6 Q1.

**Proposed convention (answers §6 Q2):** folders, not header annotations — they are explicit, lintable, and visible in file trees.

```text
src/server/plugin/*.php   → Companion Plugin (all modes)
src/server/theme/*.php    → Native theme only (Tier 3, flagged by doctor for decoupled)
src/server/*.php          → legacy: treated as theme + deprecation warning
```

### 8.6 Cost of the Breaking Changes (pre-stable, so acceptable)

ForgeWP has no stable release yet, so breaking changes are cheap now and expensive later. Existing projects become the migration test suite.

| Change | Effort (est.) | Risk | Notes |
|---|---|---|---|
| `src/server/{plugin,theme}` split in compiler | ~1 day | Low | 9 files across 2 projects to re-home |
| Declarative `redirects` config (PHP + Next + edge) | 1–2 days | Low | Removes 2 escape-hatch files |
| Theme mods → plugin-owned options + migration | 2–4 days | Medium | ~10 compiler call sites; needs activation migration + LocalWP test |
| Companion Plugin extraction (two emitters, plugin header, versioning, deploy of 2 ZIPs) | 1–2 weeks | Medium–High | Largest change; touches `generate-theme.js` (3k lines) and every `functions/*.js` emitter |
| `ForgeWpRuntime` + resource contract, piloted on 1 resource | ~1 week | Medium | Then ~1–2 days per additional resource; mechanical once the pattern exists |
| Cross-mode parity CI | ~1 week | Low | Builds on the LocalWP e2e runner |

Estimates assume focused work and existing test coverage; treat as order-of-magnitude.

### 8.7 Answers to §6 Open Questions

| # | Question | Recommendation |
|---|---|---|
| 1 | Hybrid day-one or later? | **Router day-one, Hybrid as early beta.** Pure Decoupled needs the same-domain edge router anyway, so Hybrid's marginal cost is dual build + per-route cache rules, not a new system. Because real customer projects depend on Category C plugins, Hybrid should follow v1 closely (v1.1 beta). v1 launch: Native hosting + Pure Decoupled for preflight-green sites + router built with a route table from day one. The framework only needs to be *Hybrid-ready* now (route manifest + `wpMode`). |
| 2 | `src/server/*.php` split | Folder convention (8.5). Recurring patterns graduate to declarative primitives. |
| 3 | Cross-origin auth (self-hosted) | Recommend a **BFF pattern** on self-hosted cross-origin: Next.js route proxies `/wp-json/*` on its own origin, so WP cookies become first-party to the Next domain. Same-domain is the supported default; pure cross-origin JWT remains possible but documented as Tier 2 with caveats. |
| 4 | `WpFormFields` API identical across modes | Falls out of 8.3.1–8.3.2: `<WpFormFields form="contact" />` reads `forms:contact` from the runtime layer. Native = PHP pre-filled cache; Decoupled RSC = server fetch passed through the same context. Same JSX in both. |
| 5 | Strictness of `<WpShortcode>` for decoupled | **Hard error** (`compatible: false`) unless the route is in `hybridRoutes`. No silent degradation. |
| 6 | Registry vs heuristics | Curated registry for top plugins + heuristics as *warnings only*; never let heuristics silently pass. Infra-phase work. |
| 7 | Vite vs Next.js | **Next.js App Router is the only decoupled target.** Freeze Vite SPA decoupled mode (keep it for Native island development). Two decoupled runtimes would double the parity surface. |

### 8.8 Proposed Engineering Order (alternative to §5)

The key difference from §5: **foundations first, then fixes become mechanical.**

1. **Phase A — Foundations (do first, while pre-stable)**
   - `ForgeWpRuntime` + `defineResource()` contract, piloted end-to-end on **site-settings** (small, touches options, theme mods, and menus).
   - Lint rule banning direct hydration-global reads; fail-loud production behavior.
   - Theme-mod → plugin-option migration (8.4).
2. **Phase B — Companion Plugin extraction**
   - Two emitters (plugin + theme), `src/server/{plugin,theme}` split, declarative `redirects`.
   - Re-test and fix `hospitality`, `hotelchecker24`, `forge-commerce`, `forgewp-auth` as the migration suite.
3. **Phase C — Port remaining resources onto the contract**
   - Forms → menus/routes → i18n → editables/repeaters → SEO (absorbing `hreflang`/`og`/`schemas` patterns) → auth/me (with real server guards) → WooCommerce.
   - This *is* the brief's Phase 1, done on the new foundation.
4. **Phase D — Manifest, doctor, parity CI**
   - Route capability manifest; `forgewp doctor --target ... --json` reads it; cross-mode parity tests in CI.
5. **Phase E — Infra (outside framework)**
   - Same-domain router with route table, revalidation webhooks, Draft Mode, Hybrid beta, compatibility registry.

### 8.9 Realistic Outcome

- **Sites built on ForgeWP primitives:** true one-click, reversible, preflight-gated switching is achievable once Phases A–D land.
- **Sites with Category C plugins:** "one click to Hybrid" is the honest and still strong promise.
- **Category D (page builders):** out of scope; doctor says so up front.

### 8.10 Decisions Needed From Founder

1. Approve the Section 8 ordering (foundations first) vs. the Section 5 ordering (patch-first)?
2. Confirm breaking changes are acceptable pre-stable, with existing projects as the migration suite.
3. Confirm Next.js as the sole decoupled target.
4. Infra v1 scope: Native + Pure Decoupled with router day-one and Hybrid as v1.1 beta, or Hybrid at launch?

---

## 9. Locked Architectural Decisions (Consensus — Nov 2026)

Following multi-agent review (Sections 1–7, Section 8, and final synthesis), the following decisions are **locked** as the engineering contract for ForgeWP and future ForgeWP Infra:

| # | Decision Area | Locked Direction |
|---|---|---|
| **1** | **Engineering Order** | **Foundations first (Section 8 order)** with two pragmatic adjustments: (a) keep `ForgeWpRuntime` + resource registry **lean** (shared JSON contract + pluggable `nativeSource` / `restSource` / `fixtureSource`, piloted on `site-settings` and `forms` — no heavy custom codegen DSL upfront), and (b) pull a lightweight **Route Capability Manifest (`forgewp-manifest.json`) + `forgewp doctor --target native\|decoupled\|hybrid --json`** up into **Phase A** for immediate visibility and CI guardrails. |
| **2** | **Breaking Changes (Pre-Stable)** | **Approved now while pre-stable.** Extract the **Companion WordPress Plugin**, move theme-scoped state (`nav_menu_locations`, `custom_logo`, Customizer settings) into plugin-owned options with activation migration, split escape hatches into `src/server/plugin/*.php` vs. `src/server/theme/*.php`, and graduate recurring patterns (`redirects`, SEO head/schema) to declarative primitives. Use `hospitality`, `hotelchecker24`, `forge-commerce`, and `forgewp-auth` as the migration test suite. |
| **3** | **Decoupled Target Policy (Next.js vs. Vite React)** | **Next.js App Router is the first-class, full-parity Decoupled & Hybrid target** (SSR/ISR, dynamic SEO metadata, Draft Mode, server-side auth guards, Hybrid route delegation). **Vite React** remains the primary Native WP + islands adapter — we will **not** build/maintain a separate custom Vite SSR server runtime. However, because `ForgeWpRuntime` (`restSource`) and the Companion Plugin REST API are shared across `@forgewp/react`, static/CSR decoupled deployment for Vite React remains possible on the same REST contract, with SPA trade-offs (no SSR HTML/ISR/server auth) surfaced clearly by `forgewp doctor`. |
| **4** | **Future Cloud / Infra Scope** | Build the **same-domain Edge Router with a route table from day one** (needed for first-party cookies, nonces, and trusted client IPs in Pure Decoupled anyway). Launch Infra v1 with **Native + Pure Decoupled** for preflight-green sites, and unlock **Hybrid mode** immediately after (v1.1 beta) using the exact same route manifest and edge router. |
| **5** | **Category C Plugins & `<WpShortcode>`** | **Drop the iframe embed bridge (§3 Solution 2)** — Hybrid route delegation is the clean solution for Category C plugins. In Pure Decoupled preflight, `<WpShortcode>` / `mode: 'shortcode'` is a **hard error (`compatible: false`)** unless the route is delegated via `hybridRoutes`. Never silently degrade in production. |

### Execution Phases (Locked)
- **Phase A (Foundations + Visibility):** Lean `ForgeWpRuntime` + resource contract (piloted on `site-settings` & `forms`), fail-loud production behavior + lint rule banning direct `window.forgeWpHydration` reads, lightweight `forgewp-manifest.json` + `forgewp doctor --target`, and theme-mod → plugin-option migration.
- **Phase B (Companion Plugin Split):** Separate plugin + theme emitters, `src/server/{plugin,theme}` folder split, declarative `redirects`, and migration verification across existing monorepo projects.
- **Phase C (Port Remaining Resources):** Menus/routes, i18n, editables/repeaters, SEO (`/forgewp/v1/seo`), server-enforced auth guards, and WooCommerce onto `ForgeWpRuntime`.
- **Phase D (Cross-Mode Parity CI):** Automated Native (LocalWP) vs. Decoupled (Next.js) payload + DOM + form/auth parity checks in CI.
- **Phase E (ForgeWP Infra):** Same-domain edge router, revalidation webhooks, Draft Mode bridge, Hybrid v1.1 beta, and live plugin compatibility endpoint.
