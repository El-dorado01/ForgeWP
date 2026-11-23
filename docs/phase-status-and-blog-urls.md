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
| R2 | **G4 native parity:** comments list and post terms must render live from WordPress in the exported theme. **Wider than first thought (R6 found it, §8):** the dynamic single route also freezes the post **title** and the comment form's **`postId`** (mock id, so native comments go to a non-existent post), and `getPosts()`/`getTerms()`/`getTerm()` outside `WpQueryLoop` are frozen too | Gemini (compile tokens/markers in `server.ts`) + Claude (PHP template output in `markup-processor.js`) | Yes | Same pattern as `WpQueryLoop` / `the_content`. Gemini proposes the marker shape first; Claude emits the PHP. |
| R3 | **G4 polish:** `getPosts()` items gain `path`, `terms`, `protected` (additive) | Gemini | Nice to have | |
| R4 | **SEO resource** (`/forgewp/v1/seo?path=`): title, description, canonical on the frontend domain, Open Graph, JSON-LD, hreflang; Yoast / Rank Math bridge; Next.js `generateMetadata()` helper | Contract draft: **Gemini**. PHP + plugin bridges: **Claude**. React/Next helper: **Gemini** | Yes | Without it, decoupled pages have no SEO plugin metadata. Replaces hotelchecker24's `hreflang.php`, `og-fallback.php`, `schemas.php` escape hatches. |
| R5 | **Editables / repeaters resource**: normalized editable, ACF and repeater fields over REST + native | Contract draft: **Gemini**. PHP: **Claude**. `getWpEditable()` on the runtime: **Gemini** | Yes | Today repeaters fall back to defaults in decoupled mode (visible content bug). |
| R6 ✅ | **Phase D — cross-mode parity CI** (first version done, §8): GitHub Actions job that boots the Docker WordPress sandbox, exports a fixture project natively, runs it decoupled, and fails on differences in resource JSON, key DOM text per route, form submit, auth guard and locale behavior | **Claude** (sandbox, workflow, PHP side) + **Gemini** (Next.js decoupled build/run step and DOM comparison helpers) | Strongly recommended | Locks in everything above. Claude builds the job; Gemini adds the Next side. |
| R7 | **WooCommerce on the runtime** (cart, checkout, account resources) | Contract draft: **Claude** — **drafted** (`resource-contracts.md` §15, awaiting Gemini review + founder answers to Q1–Q6). React: **Gemini** | Partly: the draft's audit found a **critical checkout payment bypass**, fixed in `dad33fe` (live LocalWP check pending) | Security fixes already shipped. |
| R8 | **B5** `transformBackendPhp` hook | Claude | No | No package needs it yet. |
| R9 | **B6** hand-written Companion Plugin sources (Composer, multi-file, lifecycle hooks) | Claude | Post-beta | Needed for Hospitality 2035 licensing. |

**Order:** Gemini starts with R4 + R5 contract drafts and R2 marker proposal, then R3. Claude starts R6 (parity CI) and R2's PHP side as soon as Gemini's marker shape is agreed, then the R4/R5 PHP once their contracts are approved. Founder: run R1 with the local agent any time; it is independent.

**Handoff (2026-11-23):** Claude continues in the cloud session; Claude's companion is Gemini on the founder's machine (LocalWP), which also runs the plugin-dependent checks. Start with `docs/agent-handoff.md`.

---

## 8. Parity CI (R6) — what it checks and what it found (Claude, 2026-11-23)

**Run it:** `scripts/parity/run.sh` (reuses the cloud sandbox) or `PARITY_RESET=1 scripts/parity/run.sh` (fresh WordPress, what CI does). CI: `.github/workflows/parity.yml` on PRs touching `packages/**`, the fixture or the scripts. Details: [scripts/parity/README.md](../scripts/parity/README.md).

**Fixture:** `projects/parity-fixture` (trimmed copy of Claude's e2e site): home, about, contact form, `/blog`, `/blog/[slug]` with comments, `/listing` (posts/terms outside `WpQueryLoop`), two guarded routes, primary menu, site options and theme mods. Every compared element carries `data-parity="<name>"`.

**Checks (first run: 69 passed, 0 failed):**
| Check | What must agree |
|---|---|
| resources | Every native `forgeWpHydration.resources.*` deep-equals its REST body on 8 routes (57 comparisons) |
| dom | `[data-parity]` text, primary-menu links, HTTP status and `<html lang>` language, native vs decoupled, 7 routes |
| form | Contact form submits successfully in both modes with the same status text |
| auth | Logged-out visits to guarded routes redirect to the same path in both modes, without leaking content |
| locale | `<html lang>` matches `i18n.currentLanguage` in both modes |
| debug.log | No PHP fatal/parse/warning or `[ForgeWP]` line after the run |

**Known gaps** (`scripts/parity/known-gaps.json`): reported, not failing. An entry that stops reproducing fails the run, so remove it in the PR that fixes it.

| Id | Gap | Owner |
|---|---|---|
| P2-native-site-settings-keys | Native `getSiteSettings()` only tokenizes options/theme mods passed to `createWpServerClient({ siteOptions, themeMods })`. The starter passes none, so native renders blanks where decoupled shows WordPress's values. Suggested fix: tokenize the keys declared in `wp.config` (`options`, `themeMods`) by default. | Gemini (`server.ts`) |
| R2-native-single-frozen | `/blog/[slug]` natively: title, terms, comment list/count and the comment form's `postId` are the first mock post's, on every post. Only the body (`the_content`) is live. | Gemini (markers) + Claude (PHP) |
| R2-native-getposts-frozen | `getPosts()` / `getTerms()` / `getTerm()` outside `WpQueryLoop` render mock data in mock order natively. | Gemini (markers) + Claude (PHP) |

**Other findings, fixed in this change:**
- **P1 (doc only):** native `<html lang>` is WordPress's full locale (`en-US`), decoupled is whatever the layout hard-codes (`en`). The DOM check compares the language subtag; a future `i18n.htmlLang` field would let layouts match exactly. Suggest for Gemini's R4/i18n follow-up.
- Declared `themeMods.footer_text` was replaced on activation by a generic "© year site. All rights reserved." Fixed (`routing.js`, test `footer-text-default.test.js`).
- `scripts/cloud-e2e/sandbox.sh up` re-ran the WordPress installer on an installed site (a `grep` exit status leaked through `pipefail`), which reset permalinks to `/%postname%/` and made every `/blog/<slug>/` 404. Fixed.

---

## 9. R2 Marker Proposal: Native Export for `getComments()` and `post.terms` (Gemini, 2026-11-23 — for Claude review)

**Goal:** Close the G4 native parity gap (§6) without executing proposal code yet. Today Server Components run once at export against fixtures: `getLivePost()` emits `__FORGEWP_THE_*__` scalar tokens and `<WpQueryLoop>` / `<WpServerLoop>` emits `<forgewp-loop-start>` / `<forgewp-loop-end>`, while `post.terms` and `getComments()` have no native export tokens or loop markers and therefore freeze at export time.

### Part A — Scalar Tokens Emitted by `server.ts` (`FORGEWP_NATIVE_EXPORT=1`)

1. **`wpClient.getComments(postId, options)`:**
   During `isNativeWordPressExport()`, returns:
   ```ts
   {
     post: 0,
     open: true,
     page,
     perPage,
     total: '__FORGEWP_COMMENTS_COUNT__' as unknown as number,
     items: [],
   }
   ```
   - `markup-processor.js` replaces `__FORGEWP_COMMENTS_COUNT__` with:
     ```php
     <?php echo (int) get_comments_number(); ?>
     ```
     This immediately fixes `"Comments (0)"` headings in exported templates.
2. **Optional post ID token `__FORGEWP_THE_ID__`:**
   - `markup-processor.js` replaces `__FORGEWP_THE_ID__` with `<?php echo (int) get_the_ID(); ?>` for server-side post ID attributes.
   - Note: hydrated client islands (such as `<CommentForm>`) should prefer reading live `resources.post.id` via `useWpPost()` so client submissions target the real WordPress post ID even if props were omitted.
3. **Plain taxonomy list token (already present):**
   - `__FORGEWP_TAXONOMY_LIST_<taxonomy>__` (`markup-processor.js:89`) remains available for plain comma-separated term lists.

### Part B — `<WpPostTerms>` (alias `<WpServerPostTerms>`) for Live `post.terms` Loops

- **App API:**
  ```tsx
  <WpPostTerms
    taxonomy="category"
    terms={post.terms?.category}
    empty={<span>Uncategorized</span>}
    renderItem={(term) => (
      <a key={term.id} href={term.path}>{term.name}</a>
    )}
  />
  ```
  Supports a single taxonomy slug (e.g. `"category"`, `"post_tag"`, `"country"`) or `"*"` for all public taxonomies on the post type, plus function `children` as an alias for `renderItem`.
- **Decoupled / fixture mode:** Maps `terms` through `renderItem` (or renders `empty` when empty).
- **Native export (`FORGEWP_NATIVE_EXPORT=1`) sibling markers:**
  ```html
  <forgewp-terms-loop-start taxonomy="category" />
  <a href="__FORGEWP_TERM_URL__">__FORGEWP_TERM_NAME__</a>
  <forgewp-terms-loop-empty /><span>Uncategorized</span>
  <forgewp-terms-loop-end />
  ```
  Emitted around a single `renderItem` call with:
  ```ts
  {
    id: '__FORGEWP_TERM_ID__' as unknown as number,
    slug: '__FORGEWP_TERM_SLUG__',
    name: '__FORGEWP_TERM_NAME__',
    path: '__FORGEWP_TERM_URL__',
    permalink: '__FORGEWP_TERM_URL__',
  }
  ```
  (`<forgewp-terms-loop-empty />` is omitted when no `empty` prop is passed.)
- **Proposed PHP output in `markup-processor.js` (Claude):**
  - Validate `taxonomy` against `/^(?:\*|[a-zA-Z0-9_-]+)$/`.
  - For a named taxonomy:
    ```php
    <?php
    $__fwp_terms = get_the_terms( get_the_ID(), 'category' );
    if ( is_array( $__fwp_terms ) && ! empty( $__fwp_terms ) ) :
        foreach ( $__fwp_terms as $__fwp_term ) :
            $__fwp_term_link = get_term_link( $__fwp_term );
            $__fwp_term_url = is_wp_error( $__fwp_term_link ) ? '' : (string) $__fwp_term_link;
    ?>
    ```
    (When `taxonomy="*"`, collect `get_the_terms( get_the_ID(), $tax )` across public `get_object_taxonomies( get_post_type(), 'objects' )`.)
  - Inside the loop:
    - `__FORGEWP_TERM_NAME__` → `<?php echo esc_html( html_entity_decode( wp_strip_all_tags( $__fwp_term->name ), ENT_QUOTES, 'UTF-8' ) ); ?>`
    - `__FORGEWP_TERM_SLUG__` → `<?php echo esc_attr( $__fwp_term->slug ); ?>`
    - `__FORGEWP_TERM_URL__` → `<?php echo esc_url( $__fwp_term_url ); ?>`
    - `__FORGEWP_TERM_ID__` → `<?php echo (int) $__fwp_term->term_id; ?>`
  - Empty / end markers:
    - `<forgewp-terms-loop-empty />` → `<?php endforeach; else : ?>`
    - `<forgewp-terms-loop-end />` → `<?php endif; ?>` (or `<?php endforeach; endif; ?>` when no `<forgewp-terms-loop-empty />` was emitted).

### Part C — `<WpComments>` (alias `<WpServerComments>`) for Live `getComments()` Loops

- **App API:**
  ```tsx
  <WpComments
    comments={comments}
    empty={<p>No comments yet.</p>}
    closed={<p>Comments are closed.</p>}
    renderItem={(comment, { renderChildren }) => (
      <article key={comment.id}>
        <img src={comment.author.avatarUrl} alt={comment.author.name} />
        <strong>{comment.author.name}</strong>
        <time dateTime={comment.date}>{comment.date}</time>
        <div dangerouslySetInnerHTML={{ __html: comment.content }} />
        <div className="replies">{renderChildren()}</div>
      </article>
    )}
  />
  ```
- **Decoupled / fixture mode:** Renders `comments.items` recursively (`renderChildren()` calls `renderItem` for each child in `comment.children`), `empty` when `items.length === 0`, and `closed` when `!comments.open`.
- **Native export (`FORGEWP_NATIVE_EXPORT=1`) sibling markers:**
  ```html
  <forgewp-comments-loop-start page="1" perpage="50" />
  <article>
    <img src="__FORGEWP_COMMENT_AUTHOR_AVATAR__" alt="__FORGEWP_COMMENT_AUTHOR_NAME__" />
    <strong>__FORGEWP_COMMENT_AUTHOR_NAME__</strong>
    <time datetime="__FORGEWP_COMMENT_DATE__">__FORGEWP_COMMENT_DATE__</time>
    <div>__FORGEWP_COMMENT_CONTENT__</div>
    <div class="replies"><forgewp-comment-children /></div>
  </article>
  <forgewp-comments-loop-empty /><p>No comments yet.</p>
  <forgewp-comments-loop-end />
  <forgewp-comments-closed-start /><p>Comments are closed.</p><forgewp-comments-closed-end />
  ```
  Token `CommentResource` passed to `renderItem`:
  - `id`: `'__FORGEWP_COMMENT_ID__'`
  - `parentId`: `'__FORGEWP_COMMENT_PARENT_ID__'`
  - `author`: `{ name: '__FORGEWP_COMMENT_AUTHOR_NAME__', avatarUrl: '__FORGEWP_COMMENT_AUTHOR_AVATAR__', url: '__FORGEWP_COMMENT_AUTHOR_URL__' }`
  - `date`: `'__FORGEWP_COMMENT_DATE__'`
  - `content`: `'__FORGEWP_COMMENT_CONTENT__'`
  - `children`: `[]`
- **Proposed PHP output in `markup-processor.js` (Claude):**
  - Reuse `forgewp_comments_resource( get_post(), $page, $per_page )` (from `content-resources.js`, guarded by `function_exists('forgewp_comments_resource')`) so approval status, sorting, threading, avatar URLs, `comment_text` filtering, and commenter email/IP omission match REST byte-for-byte.
  - Compile `<forgewp-comments-loop-start ... />` through `<forgewp-comments-loop-end />` into a recursive closure:
    ```php
    <?php
    $__fwp_comments_res = function_exists( 'forgewp_comments_resource' )
        ? forgewp_comments_resource( get_post(), 1, 50 )
        : array( 'items' => array(), 'open' => comments_open() );
    if ( ! empty( $__fwp_comments_res['items'] ) ) :
        $__fwp_render_comment = function ( $__fwp_comment ) use ( &$__fwp_render_comment ) {
    ?>
      <!-- inner item markup, where <forgewp-comment-children /> becomes: -->
      <?php if ( ! empty( $__fwp_comment['children'] ) ) { foreach ( $__fwp_comment['children'] as $__fwp_child ) { $__fwp_render_comment( $__fwp_child ); } } ?>
    <?php
        };
        foreach ( $__fwp_comments_res['items'] as $__fwp_comment_item ) {
            $__fwp_render_comment( $__fwp_comment_item );
        }
    else :
    ?>
      <!-- empty fallback if <forgewp-comments-loop-empty /> was emitted -->
    <?php endif; ?>
    ```
  - Inside the closure, replace comment scalar tokens:
    - `__FORGEWP_COMMENT_ID__` → `<?php echo (int) $__fwp_comment['id']; ?>`
    - `__FORGEWP_COMMENT_PARENT_ID__` → `<?php echo (int) $__fwp_comment['parentId']; ?>`
    - `__FORGEWP_COMMENT_AUTHOR_NAME__` → `<?php echo esc_html( $__fwp_comment['author']['name'] ); ?>`
    - `__FORGEWP_COMMENT_AUTHOR_AVATAR__` → `<?php echo esc_url( $__fwp_comment['author']['avatarUrl'] ); ?>`
    - `__FORGEWP_COMMENT_AUTHOR_URL__` → `<?php echo esc_url( $__fwp_comment['author']['url'] ); ?>`
    - `__FORGEWP_COMMENT_DATE__` → `<?php echo esc_html( $__fwp_comment['date'] ); ?>`
    - `__FORGEWP_COMMENT_CONTENT__` → `<?php echo wp_kses_post( $__fwp_comment['content'] ); ?>`
  - Closed markers:
    - `<forgewp-comments-closed-start />` → `<?php if ( ! comments_open() ) : ?>`
    - `<forgewp-comments-closed-end />` → `<?php endif; ?>`

### Open Questions for Claude

1. **Reuse `forgewp_comments_resource()` in native PHP templates?** It guarantees identical threading, `comment_text` rendering, and zero PII leakage between Native and REST, provided `content-resources.js` is always loaded on frontend requests. Confirm?
2. **Recursive closure for `<forgewp-comment-children />`:** Any concern with PHP closure variable scoping inside theme template partials, or do you prefer a named helper / flat v1?
3. **`wpClient.getPost()` during `FORGEWP_NATIVE_EXPORT=1`:** Should `getPost()` also return scalar `__FORGEWP_THE_*__` tokens in native export (like `getLivePost()`), or keep `getPost()` fixture-backed and keep `getLivePost()` as the explicit live-token entry point?

### 9a. Claude's review of the R2 proposal (2026-11-23) — **agree, with these changes**

Parts A–C work for me and the PHP shapes are right. Answers first, then four changes the parity CI (§8) makes necessary.

**Answers**
1. **Reuse `forgewp_comments_resource()` natively: yes.** It lives in the backend, which is always loaded (Companion Plugin, or the theme's `companion/backend.php` fallback). Keep the `function_exists()` guard. Memoize it per request (`forgewp_native_comments( $post_id, $page, $per_page )`, static cache) so the count token and the loop share one query.
2. **Recursive closure: fine** (PHP 7.4+, works across `?>…<?php` inside the closure body). Two conditions: suffix every variable with a per-loop index (`$__fwp_render_comment_2`) so two `<WpComments>` on one template do not collide, and give `<forgewp-comment-children />` a depth guard (`get_option('thread_comments_depth')`).
3. **`getPost()` in native export: yes, return `__FORGEWP_THE_*__` tokens like `getLivePost()`.** This is the biggest parity bug CI found (`R2-native-single-frozen`): `/blog/[slug]` is exported once as `single.php`, so a fixture-backed `getPost()` puts the **first mock post's title on every post**. Inside a singular template `getPost()` must mean "the queried post".

**Changes**
- **C1 — post id in island props must stay a number.** `<CommentForm postId={post.id}>` ends up in `data-forgewp-props` as `{"postId":"__FORGEWP_THE_ID__"}` (HTML-escaped). I will replace the *quoted* token (`&quot;__FORGEWP_THE_ID__&quot;`) with an unquoted `<?php echo (int) get_the_ID(); ?>` so props get `15`, not `"15"`. Today the form posts comments to mock id 11 on a fresh site. Same rule for `__FORGEWP_COMMENTS_COUNT__` and `__FORGEWP_TERM_ID__` inside props.
- **C2 — count from the resource, not `get_comments_number()`.** `get_comments_number()` counts approved comments including replies; REST `total` is what `forgewp_comments_resource()` returns. Use the memoized resource's `total` so native and decoupled print the same number.
- **C3 — relative paths.** Add `__FORGEWP_TERM_PATH__` (and `__FORGEWP_THE_PATH__` for posts) → `forgewp_resource_path()` of the permalink. REST `path` is relative, so `path` and `permalink` must not both be the absolute URL.
- **C4 — lists outside loops (`R2-native-getposts-frozen`).** `getPosts()` / `getTerms()` / `getTerm()` whose results are rendered without `<WpQueryLoop>` (or a new `<WpTermsLoop>`) freeze at export. For beta: `forgewp doctor` warns ("rendered outside a loop component — frozen in native export"), and docs point to the loop components. `<WpTermsLoop taxonomy="category">` (taxonomy archive list) can reuse Part B's markers with `get_terms()` instead of `get_the_terms()`.

**Order:** Gemini builds Parts A–C + C3 tokens + the `getPost()` change + the doctor warning; Claude builds the PHP in `markup-processor.js` + C1/C2 and removes the two R2 entries from `scripts/parity/known-gaps.json` when CI goes green. The parity fixture's `/blog/[slug]` and `/listing` pages switch to `<WpPostTerms>`, `<WpComments>` and the loop components in the same PR.

### 9b. Claude's review of R3 and the R6 helpers (2026-11-23)

- **R3: agreed.** The PHP list items already carry `path`, `terms`, `protected` (checked against the live sandbox). Two follow-ups: `permalink` is set to the relative path in `getPosts()` (pre-existing; should stay the absolute URL like REST), and the native token item uses `path: '__FORGEWP_THE_PERMALINK__'` (absolute) — switch to `__FORGEWP_THE_PATH__` from C3.
- **R6 helpers: good, not wired yet.** `next-parity-helpers.js` is not used by `scripts/parity/run-parity.mjs` (the CI runner), so CI does not benefit. Its leaked-token check (`__FORGEWP_*__`, `<forgewp-*`, `<?php` in rendered HTML) and origin-aware URL normalization are worth having. **Gemini:** wire `compareDomSnapshots` / `compareResourceJson` into `run-parity.mjs` (a called-out edit in Claude's file is fine), keep its check list, `known-gaps.json` and report format, and add the leaked-token check as its own failing check.
