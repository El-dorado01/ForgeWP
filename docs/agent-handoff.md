# Agent Handoff: Claude and Gemini

**Written by:** Claude (cloud session), 2026-11-23, at `main` after `ec5541a` (R1 LocalWP report).  
**For:** Claude and Gemini. Read this first, then the documents it links.

**Update (same day):** Claude continues in the **cloud session** (Docker sandbox: `scripts/cloud-e2e/sandbox.sh`). Claude's companion is now **Gemini running on the founder's machine** with LocalWP and a visible browser. Gemini keeps the Gemini task queue below and also owns the plugin-dependent checks (WooCommerce, Events Manager, Polylang, SEO plugins) from `docs/localwp-verification-checklist.md`, plus the LocalWP re-verification of Claude's fixes that need those plugins. Ownership of files is unchanged.

---

## 1. How we work (unchanged)

- **Founder merges.** Agents work on their own branches and open small PRs; only the founder merges to `main` or tells an agent to.
- **Ownership** ([parallel-workstreams.md](parallel-workstreams.md)): **Gemini** owns `packages/react/src/**`, the Next.js adapter compile files (`next-*.js`), doctor/CLI and the route manifest. **Claude** owns the PHP emitters in `packages/compiler/lib/functions/**`, `generate-theme.js`, `export-theme.js`, `companion-plugin.js`, `php-builders.js`, `markup-processor.js` (PHP output), e2e tooling, and project migrations under `projects/*/src/server/**`. Tiny isolated fixes in the other agent's files are allowed if called out in the handoff.
- **Contracts first** ([resource-contracts.md](resource-contracts.md)): every resource has one JSON shape; one agent drafts, the other reviews, the founder approves, then both build. Never change an approved shape alone.
- **Fix or document:** small safe bugs get fixed with a test; anything needing design goes into `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` (observed behavior, why it matters, suggested improvement, acceptance criteria).
- **Verify live, every time.** Unit tests are not enough: twice "done" fixes did not work in a browser (forms env inlining, form timer). Every handoff ends with **"Verified in a browser against WordPress: yes/no"**, and the other agent re-verifies before the founder merges.
- **Handoff note** at the end of every session (template in [parallel-workstreams.md](parallel-workstreams.md) §5).

---

## 2. Where things stand

| Phase | Status |
|---|---|
| A — Foundations | ✅ Done (runtime, fail-loud, lint, manifest/doctor, site-settings, forms, theme state, legacy keys removed) |
| B — Companion Plugin | ✅ Beta-critical done (plugin + embedded fallback, `src/server/{plugin,theme}`, `redirects`, `/blog` URLs, lifecycle). Open: B5, B6 (post-beta) |
| C — Resources | ✅ `site-settings`, `forms`, `menus`, `routes`, `i18n`, `auth-me` + guards, `posts`, `terms`, `comments`. Open: R2 native comments/terms, R4 SEO, R5 editables, R7 WooCommerce |
| Security | ✅ Cross-site cookie rule for every nonce-less cookie fallback; `SameSite=Lax` on WordPress auth cookies (both verified on LocalWP in R1) |
| R1 LocalWP pass | ✅ Done ([localwp-verification-report.md](localwp-verification-report.md)), 5 issues fixed in `b864db9`; full compiler suite re-run by Claude after it: 870 passed |
| D — Parity CI | Not started (R6) |

Live status and the task table: [phase-status-and-blog-urls.md](phase-status-and-blog-urls.md) §7.

---

## 3. Task queue

### Claude

| Order | Task | Notes |
|---|---|---|
| 1 | **Fix route-ID overwrite on theme re-activation** (R1 report §3.1) | In `functions/routing.js`, `forgewp_auto_create_pages_and_menus()` re-tags each matched page with `forgewp_route_id` on every run ("self-heals on every request"). Fallback "Coming next" entries from menu links (`collectFallbackPageRoutes`) carry `template: page-placeholder.php`, so their route id is `placeholder`; when such an entry matches a real page by slug (hotelchecker24's English `contact`, post 17, route `kontakt-page`), the real id is overwritten with `placeholder`. Never overwrite a non-placeholder route id with `placeholder`, and do not re-template a page that already has a real ForgeWP template. Add a PHP-executing regression test; verify by re-activating hotelchecker24 on LocalWP and checking `/en/` `pageLinks`. |
| 2 ✅ | **R6 — Phase D parity CI** (done: `scripts/parity/`, `.github/workflows/parity.yml`, fixture `projects/parity-fixture`; findings in status doc §8) | GitHub Actions job: boot WordPress + MariaDB + Mailpit (reuse `scripts/cloud-e2e/docker-compose.yml`), export a fixture project natively and activate it, run the same project decoupled (`next build && next start` against that WordPress), then fail on differences in: `resources.*` vs REST (deep-equal after `JSON.parse`), key DOM text per route, form submit, auth guard, locale. Gemini supplies the Next.js run step and DOM-compare helpers. Start from `projects/e2e-next` (Claude's test site, local only; promote a trimmed copy into the repo as the CI fixture). |
| 3 | **R2 PHP side** — native comments list and post terms | After Gemini's marker proposal. Same pattern as `WpQueryLoop` / `the_content`: `markup-processor.js` turns the markers into PHP loops reading live WordPress data. |
| 4 | **R4 / R5 PHP** — SEO resource (Yoast/Rank Math bridge, frontend-domain canonicals, hreflang, JSON-LD) and editables/repeaters resource | After Gemini's contract drafts are approved. Reuse `forgewp_seo_plugin_active()` (now Rank-Math-registration aware). |
| 5 ✅ | **R7** WooCommerce contract draft (done: `resource-contracts.md` §15; checkout payment fix `dad33fe`). PHP build starts after Q1–Q6 are answered | Use R1 findings: same-origin Woo endpoints need `X-WP-Nonce`; WooCommerce Blocks Cart skeletons vs React cart badge on `forge-commerce`; decoupled checklist 1d not yet run. |
| later | R8 `transformBackendPhp` hook, R9 hand-written plugin sources (Hospitality 2035) | Post-beta. |

### Gemini

| Order | Task | Notes |
|---|---|---|
| 1 | **R2 marker proposal** | How `getComments()` results and `post.terms` are marked during native export so Claude can emit PHP (like `WpQueryLoop`). **Scope grew (parity CI):** the single route's `post.title` and the `postId` passed to islands are frozen too, and so are `getPosts()`/`getTerms()`/`getTerm()` outside `WpQueryLoop`. Write it in the status doc; agree with Claude before building. |
| 2a | **Review R7 draft** (`resource-contracts.md` §15, Q1–Q6) | Your side: one cart stack, `formatMoney`, env vars, cart token. |
| 2 | **R4 + R5 contract drafts** | SEO (`/forgewp/v1/seo?path=`) and editables/repeaters, in `resource-contracts.md`, for Claude's review and founder approval. |
| 3 | **R3** | `getPosts()` list items gain `path`, `terms`, `protected` (additive). |
| 3a | **P2: native `getSiteSettings()` keys** | Tokenize the `options` / `themeMods` declared in `wp.config` by default, not only those passed to `createWpServerClient()`. Parity CI gap `P2-native-site-settings-keys`; delete it from `scripts/parity/known-gaps.json` in the fix PR. |
| 4 | R6 Next.js side | Claude shipped a first version of the decoupled build/run and DOM compare (`scripts/parity/run.sh`, `run-parity.mjs`). Review it and extend coverage (client navigation, islands after hydration, comment submit, logged-in auth). |
| 0b | **Verify Claude's checkout fix on LocalWP** (`dad33fe`, WooCommerce) | Export `forge-commerce` from `main` after merge. With COD and BACS enabled: (1) `POST /checkout/process` with `payment_method: "stripe"` → `400 invalid_payment_method`, no order; (2) BACS → order `on-hold`, COD → `processing`, both with emails in Mailpit; (3) a flat-rate shipping method chosen in the cart appears on the order; (4) `GET /checkout/gateways` lists only enabled gateways; (5) `POST /cart/remove-coupon` works. Then look into the WooCommerce Blocks Cart skeleton (R1 §3) with browser console + network. |
| 0 | **Verify Claude's Task 1 fix on LocalWP** | Re-export `hotelchecker24` from `claude/pensive-pasteur-tov58c`, re-activate it twice (switch to Twenty Twenty-Five and back), then check post 17 keeps `forgewp_route_id = kontakt-page` and `/en/` `pageLinks` points `kontakt-page` at the English contact page. |
| note | Nonce forwarding | R1 confirmed same-origin `wishlist`, `customer/*` and `checkout/process` return 401 without `X-WP-Nonce`; client code must always forward `restNonce`. |

---

## 4. Map of Claude's code (compiler PHP)

`buildFunctionsPhpParts()` in `lib/functions/index.js` returns `{ header, backend, theme }`. **Backend** ships in the Companion Plugin and in the theme's `companion/backend.php`; **theme** goes to `functions.php`. `test/functions/companion-plugin.test.js` fails if backend code calls a theme-only function or theme path.

| Module (`lib/functions/`) | What it emits |
|---|---|
| `../companion-plugin.js` | Plugin main file, embedded fallback loader, version-mismatch notice |
| `site-settings-resource.js` | `site-settings` REST + builder (private options excluded) |
| `theme-state.js` | `forgewp_theme_state` option with theme-mod read/write filters; survives theme switches and core's menu remap |
| `phase-c-resources.js` | `menus`, `routes` (+ `pageLinks`), `i18n` (dictionary embedded), `?lang=` rule, `forgewp_resource_path()` / `forgewp_raw_home_url()` |
| `content-resources.js` | `posts`, `terms`, `comments` (GET + guarded POST), native `resources.post/.posts/.term` |
| `rest-endpoints.js` | Auth (incl. `/auth/me` + `forgewp_auth_resolve_session_user()`), WooCommerce routes |
| `network-helpers.js` | Origin allowlist (`FORGEWP_FRONTEND_ORIGIN`), trusted-proxy client IP, `forgewp_cookie_auth_request_allowed()` |
| `auth-cookies.js` | `SameSite` on WordPress auth cookies (`FORGEWP_AUTH_COOKIE_SAMESITE`) |
| `forms.js` | Native Forms, `forms` resource, configurable/observable time trap |
| `redirects.js` | Declarative `redirects` (`template_redirect`) |
| `posts-routing.js` | `/blog` Option 1: Posts page, `/blog/%postname%/` on fresh sites, deferred rewrite refresh, admin notice |
| `routing.js` | Page/menu provisioning, static front page, SEO-plugin detection |
| `seed-mock-data.js` | Mock seeding (core sample post ignored, HTML → block markup) |
| `hydration-enqueuer.js` | Front-end only (`is_admin()` guard), `forgeWpHydration.resources.*` |

**Conventions:** one PHP builder per resource feeds both REST and native hydration; parity means deep-equal after `JSON.parse` (REST escapes `/` and non-ASCII differently); empty maps are cast `(object)` so they encode as `{}`; tests execute the generated PHP with small WordPress stand-ins (see `theme-state.test.js`, `phase-c-resources.test.js`) rather than only matching strings.

---

## 5. Gotchas we already paid for

1. **PHP inside JS template literals:** backslashes are consumed by JavaScript. `\d` must be written `\\d` (R1's order-detail 404), namespaces `RankMath\\Helper`. Check generated PHP with `php -l` and a live request.
2. **WordPress REST ignores the login cookie without `X-WP-Nonce`.** Server-to-server checks (Next.js guards) rely on `forgewp_cookie_auth_request_allowed()`; never add a cookie fallback without it (a test enforces this).
3. **Rewrite rules:** taxonomy permastructs capture the permalink front when they register, so a flush in the same request as a permalink change writes stale rules; defer to the next request (see `posts-routing.js`).
4. **Theme switches:** core's `_wp_menus_changed()` rewrites menu locations; theme mods are per theme. Use `forgewp_theme_state`.
5. **Polylang filters `home_url()`** per language; use `forgewp_raw_home_url()` for path math.
6. **`enqueue_block_assets` also fires in the block editor**: keep front-end JS out (`is_admin()` guard) or the editor breaks (React #525).
7. **`next dev` leaks Server Component props** in React debug data; judge security only on `next build && next start`.
8. **PHP opcache:** after editing `wp-config.php`, wait a few seconds before re-testing.
9. **Mock data and fresh installs:** the core "Hello world!" post exists on every install; WordPress defaults to "latest posts" on the front page.

---

## 6. Kickstart

- **Claude:** pull `main`, read this file and §7 of the status doc, `pnpm install`, `pnpm --filter @forgewp/compiler test` (expect 870 passed), then start Task 1.
- **Gemini (local):** pull `main`, read §3 above and the status doc §7, do task 0 (LocalWP check of Claude's fix), then the R2 marker proposal.
