# Phase Status (A/B) and the `/blog` URL Decision

**Date:** 2026-11-23  
**Written by:** Claude, for founder and Gemini review  
**Related:** [dual-mode-portability-architecture.md](dual-mode-portability-architecture.md) §9 · [parallel-workstreams.md](parallel-workstreams.md) · [resource-contracts.md](resource-contracts.md)

---

## 1. Can Gemini start Phase C now?

**Yes.** Gemini owns only one remaining Phase B task (B3, redirects in `withForgeWP()`), and it is small and independent. Gemini can do B3 first and then start Phase C on the React side in parallel with Claude's remaining Phase B work. Nothing Claude still has to do in Phase B blocks Gemini's Phase C work.

Phase C contracts (`menus`, `routes`, `i18n`) are drafted by Gemini and reviewed by Claude ("approve with three amendments", see resource-contracts.md "Claude review of §5–§7"). **They still need founder approval** before either agent builds against them.

---

## 2. Phase A — done

All Phase A items from §9 are shipped and verified live in the cloud sandbox (WordPress 7.1.5).

| Item | Owner | Status |
|---|---|---|
| Lean `ForgeWpRuntime` (native / REST / fixture sources) | Gemini | ✅ Done |
| Fail loud in production (no silent forms simulation, no hardcoded `'de'`) | Gemini | ✅ Done, verified live |
| Lint rule against direct hydration-global reads | Gemini | ✅ Done |
| Route Capability Manifest + `forgewp doctor --target --json` | Gemini | ✅ Done |
| `site-settings` resource: REST + native hydration, `private` options | Claude (PHP) + Gemini (React) | ✅ Done, REST/native deep-equal |
| `forms` resource: REST + native hydration, origin allowlist, trusted-proxy IP | Claude (PHP) + Gemini (React) | ✅ Done, decoupled submit stored + mailed |
| Theme state independent of the active theme | Claude | ✅ Done, survives theme switches |
| Legacy `siteSettings` / `forms` hydration keys removed | Gemini (Claude signed off) | ✅ Done |

---

## 3. Phase B — core done, four beta-critical items left

### Done (Claude)
- **Companion Plugin.** Every export writes `<slug>-companion` (plugin + ZIP) with the backend: content types, auth/forms/WooCommerce REST, the `forgewp/v1` bridge, theme state, site settings, Theme Options page. The theme embeds the same backend and uses it only when the plugin is not active. Verified live: theme only, theme + plugin, plugin only under `twentytwentyfive`.
- **`src/server/plugin/` vs `src/server/theme/`**, with the old flat folder still working (deprecation warning).
- **Declarative `redirects`** in `wp.config.ts`, served by the Companion backend.
- **hospitality** and **hotelchecker24** migrated; hotelchecker24 verified live.

### Remaining

| # | Task | Owner | Beta-critical | Notes |
|---|---|---|---|---|
| B1 ✅ | Re-verify the other monorepo projects after the split: `forge-commerce`, `forgewp-auth` (live in the sandbox), `hospitality` (export + live without Events Manager) | **Claude** | Yes | WooCommerce and Events Manager cannot be downloaded in the cloud sandbox (wordpress.org is blocked); their plugin-dependent paths need a founder LocalWP pass. Done 2026-11-23: forgewp-auth (13 routes), forge-commerce (7), hospitality (22) all 200 as native theme, and site-settings/routes/auth endpoints 200 with only the plugin under twentytwentyfive; no fatals or warnings. WooCommerce/Events Manager paths still need a LocalWP pass. |
| B2 ✅ | Plugin lifecycle in WordPress: deactivate the plugin → theme falls back to its embedded backend with no data loss; update the plugin while the theme is active; version-mismatch notice | **Claude** | Yes Done 2026-11-23: deactivating the plugin falls back to the embedded backend with settings, theme mods, submissions and menus intact; mismatch notice shown; deleting the plugin keeps all data. |
| B3 ✅ | Next.js side of redirects: `withForgeWP()` maps `config.redirects` to `next.config` `redirects()` so the decoupled origin serves the same redirects | **Gemini** | Yes | `packages/react/src/next.ts`. Rule shape: `{ from, to, status?, ifNotFound? }` (see `ForgeWPRedirect` in `packages/compiler/lib/index.d.ts`). `ifNotFound` has no direct Next.js equivalent; suggested: emit it as a normal redirect only when no app route matches `from`, otherwise skip it and let doctor warn. Merged in #33 and verified live (301/302, query kept, `ifNotFound` skipped when a route exists). Follow-up (Gemini): `withForgeWP()` should read `redirects` from `wp.config.*` itself; importing `wp.config.ts` into `next.config.ts` crashes Next's config loader. |
| B4 ✅ | Documentation in `forgewp-docs`: Companion Plugin (when to install it), `src/server/plugin` vs `src/server/theme`, `redirects` | **Claude** | Yes Done 2026-11-23 on forgewp-docs branch `claude/pensive-pasteur-tov58c` (awaiting merge): new page *The Companion Plugin* (`/core/export-deployment/companion-plugin`), `src/server/{plugin,theme}` in the API reference, `redirects` in the wp-config reference, install note. Link check and coverage audit pass. |
| B5 | `transformBackendPhp` hook so packages can add backend PHP to the Companion Plugin | **Claude** | No | No package needs it yet (`plugin-seo` only touches the theme half). |
| B6 | Full hand-written plugin sources (Composer dependencies, multiple files, activation/upgrade/uninstall hooks) | **Claude** | Probably after beta | Needed by Hospitality 2035's EDD licensing / PDF work. |

**Ownership summary:** Gemini owns **B3** only. Claude owns B1, B2, B4 (beta-critical) and B5, B6 (later).

---

## 4. Decided: `/blog` archive and post URLs — Option 1 (approved 2026-11-23)

**Decision:** Option 1, WordPress follows the app, with the fresh-site safety rule. Gemini agreed and added a safeguard: custom post types must register with `'with_front' => false`, otherwise a `/blog/%postname%/` permalink would also prefix CPT URLs (`/blog/projects/x`). Claude: provisioning, `home.php`, permalink rule, `with_front`, admin notice. Gemini: `postsArchivePath` in `forgewp-manifest.json` and the doctor check.

Also approved the same day: PR #33 (B3) merged; Phase C contracts `menus`, `routes`, `i18n` with Claude's amendments.

**Implemented 2026-11-23 (Claude)** — `lib/functions/posts-routing.js`, `home.php` emission in `generate-theme.js`, `with_front => false` defaults; tests `test/functions/posts-routing.test.js`. Verified live: a fresh site gets `/blog/` as the Posts page and `/blog/%postname%/` (all links match decoupled); an existing site with posts keeps `/%postname%/` and sees a wp-admin notice; CPT (`/listicle/…`) and taxonomy (`/country/…`) URLs are not prefixed. Gemini: `postsArchivePath` in the manifest + doctor check still open.

### The problem

A Next.js project with `src/app/blog/page.tsx` (post list) and `src/app/blog/[slug]/page.tsx` (single post) gets different URLs in the two modes:

| | Decoupled (Next.js) | Native (WordPress) |
|---|---|---|
| Post list | `/blog` | `/blog` shows a "Coming next" placeholder page |
| Single post | `/blog/first-post` | `/first-post/` |

Why:
- WordPress only shows the post list at a page URL like `/blog` when that page is selected as the **Posts page** (Settings → Reading, `page_for_posts`). ForgeWP never sets it, and because the menu links to `/blog`, ForgeWP auto-creates a placeholder page there.
- Single-post URLs come from WordPress's **permalink structure** (default `/%postname%/`), not from the app's folder name.

Custom post types are not affected: their archive and single URLs follow the post type's rewrite slug, which already matches the app folder.

### Why it matters

URLs change when switching modes, which breaks bookmarks, shared links and search rankings, and so breaks the one-click switch promise. It is visible on the very first Next.js site a user builds, because the starter pattern has a blog.

### Options

**Option 1 — WordPress follows the app (Claude recommends).**  
The compiler already knows the post archive's base path from the folder structure (`next-dynamic-routes.js` → `archiveRoutes[].routePath`, e.g. `/blog`). On a site's first activation, ForgeWP would:
1. create (or reuse) the page at that path and set it as the Posts page (`show_on_front` stays `page`, `page_for_posts` = that page), so the list renders there; emit `home.php` from the archive template, because WordPress uses `home.php`, not `archive.php`, for the Posts page;
2. set the post permalink structure to `/<base>/%postname%/` (e.g. `/blog/%postname%/`), so single posts match the app.

Safety rule: only change permalinks on a fresh site that still uses the default structure. On an existing site with its own permalink structure, never change it automatically (that would break its live URLs); instead `forgewp doctor --target decoupled` and a wp-admin notice explain the mismatch and how to fix it.

Work split: Claude — provisioning, `home.php`, permalink rule, admin notice. Gemini — expose the post archive base path in the route manifest (if not already present) and the doctor check.

**Option 2 — The app follows WordPress.** Decoupled Next.js would mirror WordPress's permalinks with a catch-all route. Catch-all routes cannot be exported to a native theme (Tier 3, decoupled-pinned), so this gives up native mode for blogs. Not viable for dual mode.

**Option 3 — Leave it and document it.** Simplest, but users discover broken URLs when they switch modes. Not compatible with the one-click switch goal.

### Questions for Gemini

1. Agree with Option 1? Any case where deriving WordPress's blog settings from the app's folder structure would surprise a developer?
2. Is the post archive base path already in `forgewp-manifest.json`, or should it be added?
3. Should projects without a blog route keep WordPress's default `/%postname%/` untouched? (Claude: yes.)

---

## 5. Suggested order from here

1. **Founder:** approve the Phase C contracts (with Claude's amendments) and decide the `/blog` option.
2. **Gemini:** B3, then Phase C React side (`menus`, `routes`, `i18n` sources and hooks).
3. **Claude:** B2 and B1, then B4; then Phase C PHP (`/menus` collection, `/routes` + `pageLinks`, `/i18n` with the dictionary in the Companion backend, `resources.*` hydration); then the `/blog` work if Option 1 is chosen.
4. **Both:** remove the remaining legacy globals (`menus`, `pageLinks`, `forgeWpTranslations`) in one coordinated PR at the end of Phase C.

---

## 6. Next tasks for Gemini (prepared by Claude, 2026-11-23)

State of `main`: Phase C `menus` / `routes` / `i18n` done on both sides; legacy `forgeWpHydration.menus`, `.pageLinks` and `window.forgeWpTranslations` removed (Claude, verified live on e2e-next and hotelchecker24: no page errors, nav/islands/translations render). `/blog` Option 1 shipped.

| # | Task | Why / evidence | Beta-critical |
|---|---|---|---|
| G1 | **Review the four new contract drafts** in `docs/resource-contracts.md` §9–§12 (`auth-me`, `posts`, `terms`, `comments`) and reply with amendments or approval, as Claude did for §5–§7. | Founder approval needed before either side builds. | — |
| G2 | **Server-side auth guards (after §9 approval):** `WpServerRequireAuth`, `WpServerAuthGate`, `pageConfig.protected` call `/auth/me` per request with the visitor's WordPress cookies / bearer token, redirect or 403 per §9, and fail closed. Doctor warning for protected routes without same-domain routing or JWT. | Today they render children for everyone in decoupled mode (`packages/react/src/server.ts`), so protected pages are public. | **Yes** |
| G3 | **Fix doubled theme URLs in image/asset resolution.** hotelchecker24 passes `themeUri + '/Logo/…svg'` (already absolute) and the native page requests `…/themes/hotelchecker24http:/localhost:8080/wp-content/themes/hotelchecker24/Logo/…svg` (404). An absolute `http(s)://` URL must pass through unchanged, and `//` must not be collapsed inside `http://`. | Pre-existing; reproduced live before and after the cleanup. Logged in the improvement brief. | Yes (visible broken logo) |
| G4 | **`posts` / `terms` / `comments` runtime and hooks** (after §10–§12 approval), replacing the `wp/v2` + `_embed` reshaping in `server.ts`. | Contract-based parity for archives, singles, CPTs. | No (can continue in beta) |

Claude in parallel: PHP for §9 (`authenticated`, `private, no-store`, `resources['auth-me']`), then §10–§12 endpoints and native resources after approval.

### G2 verified live by Claude (2026-11-23)

Decoupled `next dev` and production `next build` + `next start` against WordPress 7.1 with ForgeWP auth enabled, protected pages `/dashboard` (any logged-in user) and `/admin-area` (`allowed="manage_options"`):

| Visitor | `/dashboard` | `/admin-area` |
|---|---|---|
| Anonymous | 307 → `/login`, no protected content in HTML or RSC payload | 307 → `/login`, none |
| Subscriber (WordPress cookies forwarded) | 200, content shown | 200 fallback, no protected content |
| Administrator | 200, content shown | 200, content shown |
| WordPress unreachable | 307 → `/login` (fails closed) | — |

Follow-ups for Gemini (not blockers):
1. Forbidden fallback returns **HTTP 200**; §12a asks for a 403 status. If a 403 status needs `forbidden()`/`authInterrupts`, document that the default is a 200 page with 403 content, or set the status where Next.js allows it.
2. **Doctor check:** a project with protected routes but no ForgeWP auth backend (`auth` not configured) gets 404 from `/auth/me`, so every visitor is redirected to login. Correct fail-closed behavior, but `forgewp doctor --target decoupled` should say why.
3. Under `next dev` only, React's development debug data includes the guard's `children` props (protected text) in the RSC payload. Production builds do not. Worth a one-line note in the docs so nobody tests security against `next dev`.

### G4 verified live by Claude (2026-11-23)

Decoupled `next dev` against WordPress 7.1, using `getPost()`, `getPosts()`, `getTerms()`, `getTerm()`, `getComments()` and `submitWpComment()` from an island:

- ✅ Decoupled single post: title, terms, block content, existing comments render; a comment posted from the browser reaches WordPress, is held for moderation and the UI shows "Your comment is awaiting moderation."; no browser errors.
- ✅ `getTerms()` / `getTerm()` return counts and paths.
- ⚠️ `getPosts()` keeps the legacy record shape: list items have `permalink` (a path) but not the contract's `path`, `terms`, `protected`. Additive fields would help developers.
- ❌ **Native parity gap:** in the exported theme the same post shows an empty terms line and "Comments (0)" with no comments, although the post has an approved comment. Server Components run once at export against fixtures; title and content compile to WordPress template tags, but `getComments()` results and `post.terms` do not, so they are frozen at export time.

---

## 7. Remaining work and owners (Claude, 2026-11-23)

Phase A is done; Phase B beta-critical work is done; Phase C core resources (`site-settings`, `forms`, `menus`, `routes`, `i18n`, `auth-me`, `posts`, `terms`, `comments`) are done on both sides. Security review done. Remaining, ordered for the Dec 31 beta:

| # | Task | Owner | Beta? | Notes |
|---|---|---|---|---|
| R1 ✅ | **LocalWP plugin pass** (WooCommerce, Events Manager, Polylang, MailPoet, Yoast/Rank Math, CSRF checks) | Local agent (founder's machine) | Yes | Done 2026-11-23 ([localwp-verification-report.md](localwp-verification-report.md)): verified all plugin paths against WP 7.1.5 + fixed 5 discovered issues in `b864db9` (`1d` decoupled skipped; follow-up notes logged). |
| R2 | **G4 native parity:** comments list and post terms must render live from WordPress in the exported theme | Gemini (compile tokens/markers in `server.ts`) + Claude (PHP template output in `markup-processor.js`) | Yes | Same pattern as `WpQueryLoop` / `the_content`. Gemini proposes the marker shape first; Claude emits the PHP. |
| R3 | **G4 polish:** `getPosts()` items gain `path`, `terms`, `protected` (additive) | Gemini | Nice to have | |
| R4 | **SEO resource** (`/forgewp/v1/seo?path=`): title, description, canonical on the frontend domain, Open Graph, JSON-LD, hreflang; Yoast / Rank Math bridge; Next.js `generateMetadata()` helper | Contract draft: **Gemini**. PHP + plugin bridges: **Claude**. React/Next helper: **Gemini** | Yes | Without it, decoupled pages have no SEO plugin metadata. Replaces hotelchecker24's `hreflang.php`, `og-fallback.php`, `schemas.php` escape hatches. |
| R5 | **Editables / repeaters resource**: normalized editable, ACF and repeater fields over REST + native | Contract draft: **Gemini**. PHP: **Claude**. `getWpEditable()` on the runtime: **Gemini** | Yes | Today repeaters fall back to defaults in decoupled mode (visible content bug). |
| R6 | **Phase D — cross-mode parity CI**: GitHub Actions job that boots the Docker WordPress sandbox, exports a fixture project natively, runs it decoupled, and fails on differences in resource JSON, key DOM text per route, form submit, auth guard and locale behavior | **Claude** (sandbox, workflow, PHP side) + **Gemini** (Next.js decoupled build/run step and DOM comparison helpers) | Strongly recommended | Locks in everything above. Claude builds the job; Gemini adds the Next side. |
| R7 | **WooCommerce on the runtime** (cart, checkout, account resources) | Contract draft: **Claude** (after R1 findings). React: **Gemini** | Post-beta unless R1 finds blockers | Security fixes already shipped. |
| R8 | **B5** `transformBackendPhp` hook | Claude | No | No package needs it yet. |
| R9 | **B6** hand-written Companion Plugin sources (Composer, multi-file, lifecycle hooks) | Claude | Post-beta | Needed for Hospitality 2035 licensing. |

**Order:** Gemini starts with R4 + R5 contract drafts and R2 marker proposal, then R3. Claude starts R6 (parity CI) and R2's PHP side as soon as Gemini's marker shape is agreed, then the R4/R5 PHP once their contracts are approved. Founder: run R1 with the local agent any time; it is independent.

**Handoff (2026-11-23):** Claude continues in the cloud session; plugin-dependent checks go to the founder's local agent. Start with `docs/agent-handoff.md`.
