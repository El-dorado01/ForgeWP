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

## 3. Task queue (updated 2026-11-23 after Gemini's R2/R3/R4/R5/R6 push and the founder's R7 decisions)

### Done since the first handoff
Route-id overwrite fix (`bf909e8`), R6 parity CI (`49c0904`, CI fixes `1d7ef51`, `aa238ad`), checkout payment fix + `/cart/remove-coupon` (`dad33fe`), R7 contract (§15, Q1–Q6 accepted), Gemini: R2 proposal (status §9), R3, R4/R5 drafts (contracts §13/§14), R6 helpers. Claude's reviews: status §9a/§9b, contracts §13/§14 "Claude review".

### Claude

| Order | Task | Notes |
|---|---|---|
| 1 ✅ | **R2 PHP** (`markup-processor.js`) — done, status §9c | Terms loop, comments loop (memoized `forgewp_native_comments()`, recursive closure with per-loop names + depth guard), count from the resource (C2), unquoted numeric tokens inside island props (C1). Remove the R2 entries from `scripts/parity/known-gaps.json` once CI is green. Starts when Gemini's markers land. |
| 2 | **R7 PHP** (§15) | ✅ money, `commerce-settings`, `products`/`product` (REST + native), contract cart + `X-ForgeWP-Cart-Token`, `POST /checkout`, parity CI with WooCommerce 11.0.1 (see §15.7a). **Left:** `GET /checkout/order`, customer + wishlist shapes, then removing legacy shapes once Gemini's client is on the contract. |
| 3 | **R4 / R5 PHP** | After the founder approves §13/§14 with Claude's answers. |
| later | R8 `transformBackendPhp`, R9 hand-written plugin sources | Post-beta. |

### Gemini (local, LocalWP)

| Order | Task | Notes |
|---|---|---|
| 0 | **LocalWP checks** of Claude's fixes | (a) Route id: re-export `hotelchecker24`, re-activate twice, post 17 keeps `forgewp_route_id = kontakt-page`, `/en/` `pageLinks` correct. (b) Checkout (`dad33fe`), COD + BACS enabled: `payment_method: "stripe"` → `400 invalid_payment_method`, no order; BACS → `on-hold`, COD → `processing`, emails in Mailpit; chosen flat-rate shipping on the order; `/checkout/gateways` lists only enabled gateways; `/cart/remove-coupon` works. (c) WooCommerce Blocks Cart skeleton on `forge-commerce` (R1 §3): console + network. |
| 1 | **R2 build** per status §9 + Claude's §9a | Parts A–C, `__FORGEWP_THE_PATH__` / `__FORGEWP_TERM_PATH__` (C3), `getPost()` returns tokens in native export, doctor warning for lists rendered outside loop components (C4). Switch the parity fixture's `/blog/[slug]` and `/listing` to the new components in the same PR. |
| 1b | **Status §9c findings** | Decoupled reads must retry then throw (no silent fixture fallback in production builds); `separator` prop for term loops; `getTerm()` native. |
| 2 | **P2: native `getSiteSettings()` keys** | Tokenize `wp.config` `options` / `themeMods` by default. Remove `P2-native-site-settings-keys` from `known-gaps.json` in the PR. |
| 3 | **Wire `next-parity-helpers.js` into `scripts/parity/run-parity.mjs`** (status §9b) | Keep the check list, `known-gaps.json`, report format; add the leaked-token check (`__FORGEWP_*__`, `<forgewp-*`, `<?php` in rendered HTML) as its own failing check. |
| 4 | **R7 client** (§15.7) | PHP is live (§15.7a). One cart stack on §15.3 in `@forgewp/woocommerce` (send `?contract=2` on `GET /cart` and `GET /products` until the legacy shapes go), `formatMoney`, runtime env vars (A6), store and send `X-ForgeWP-Cart-Token` (read it from every cart response), nonce forwarding, checkout `needsRedirect` handling (do not clear the cart on redirect). |
| 5 | R3 follow-ups (§9b) | `permalink` stays absolute in `getPosts()`; native token item uses `__FORGEWP_THE_PATH__`. |
| 6 | R4/R5 client helpers | After approval. |
| note | Nonce forwarding | Same-origin `wishlist`, `customer/*`, `checkout` need `X-WP-Nonce`; always forward `restNonce`. |
| note | Tiny edit in your area by Claude | `test/functions/next-bugfixes-regression.test.js` now expects R3's `path`/`terms`/`protected` (it failed on `main` since `e0980b0`). |

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
