# Parallel Workstreams: Claude × Gemini (Beta → Dec 31, 2026)

**Status:** Active working agreement  
**Owner / merge authority:** Founder (only the founder merges to `main`, or explicitly tells an agent to)  
**Architecture source of truth:** [dual-mode-portability-architecture.md](dual-mode-portability-architecture.md) — Section 9 (Locked Decisions)  
**Backlog source of truth:** [`FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md)

Two agents work on ForgeWP at the same time. To avoid merge conflicts and duplicated work, the work is split by **file ownership**, not by feature. The two halves meet only at **resource contracts** (Section 3).

**Beta target:** land **Phase A + Phase B** (the changes that alter project layout, deployment shape, or stored data) before the Dec 31 beta, so beta users migrate once. Phases C–D are additive and may continue during beta. Infra (Phase E) is out of scope now; we only avoid building things Infra would force us to break.

---

## 1. Who Owns What

### Gemini — React runtime, Next.js adapter internals, doctor/CLI

**Owned files (Gemini edits freely):**
- `packages/react/src/**` — `hooks.ts`, `server.ts`, `context.ts`, `next.ts`, `config.ts`, `types.ts`, `components/**`, and new runtime files (e.g. `packages/react/src/runtime/**`)
- `packages/compiler/lib/next-adapter.js`, `next-*.js` (Next.js adapter compile-side files)
- `packages/compiler/bin/doctor.js`, `packages/compiler/lib/diagnostics.js`, and new manifest emitter code
- ESLint / lint-rule config for the new "no direct hydration reads" rule

**Assignments (in order):**
1. **Phase A — `ForgeWpRuntime` (lean):** resource registry (`name`, `restPath`, `cacheTags`, `auth`) + `nativeSource` / `restSource` / `fixtureSource`. No heavy codegen DSL.
2. **Phase A — Fail loud in production:** remove the silent `'Simulated (dev)'` forms fallback (`isProductionForms()`, `hooks.ts:263`) and the hardcoded `'de'` locale fallback (`hooks.ts:1889-1916`); production with no resolvable source throws a typed configuration error.
3. **Phase A — Lint rule:** ban direct `window.forgeWpHydration` / `window.forgeWpTranslations` reads outside `nativeSource`.
4. **Phase A — Pilot `site-settings`** on the React side (`useWpOption`, `useWpThemeMod`, `wpClient.getOption()`), built against the agreed contract (Section 3).
5. **Phase A — Route Capability Manifest + `forgewp doctor --target native|decoupled|hybrid --json`**, building on `diagnoseNextNativeCompatibility()`. `<WpShortcode>` / `mode: 'shortcode'` is a hard error for `--target decoupled` unless the route is in `hybridRoutes`.
6. **Phase A — Pilot `forms`** on the React side (`submitWpForm`, `useWpFormFieldLabels`, `<WpFormFields>`, `wpClient.getForm()`).
7. **Phase C (after beta-critical work):** port menus/routes, i18n, editables/repeaters, SEO, server-enforced auth guards (`WpServerRequireAuth`, `WpServerAuthGate`, `pageConfig.protected`), WooCommerce client onto the runtime.

### Claude — Compiler PHP emitters, Companion Plugin, WordPress E2E

**Owned files (Claude edits freely):**
- `packages/compiler/lib/functions/**` (all PHP emitters: `index.js`, `routing.js`, `forms.js`, `rest-endpoints.js`, `hydration-enqueuer.js`, `theme-setup.js`, …)
- `packages/compiler/lib/generate-theme.js`, `export-theme.js`, `zip-theme.js`, `php-builders.js`, `markup-processor.js`, `render-theme.mts` (PHP-output parts)
- New Companion Plugin emitter files
- `scripts/cloud-e2e/**`, `scripts/wp-e2e-browser.mjs`, `packages/compiler/test/browser/**`
- `projects/*/src/server/**` migrations

**Assignments (in order):**
1. **Now — Next.js adapter E2E** on `projects/nextjs-adapter-fixture` (Native + Decoupled) in the cloud Docker sandbox, with screenshot gallery. Fix scoped bugs; log gaps.
2. **Phase A — PHP side of `site-settings`:** `GET /forgewp/v1/site-settings` + hydration injection emitting the identical JSON shape.
3. **Phase A — Theme-scoped state → plugin-owned options:** `nav_menu_locations`, `custom_logo`, `footer_text`, Customizer settings (`'type' => 'option'`), with one-time activation migration from `theme_mods_{slug}`.
4. **Phase A — PHP side of `forms`:** `GET /forgewp/v1/forms` + `/forms/<name>`, CORS / `FORGEWP_FRONTEND_ORIGIN` + trusted-proxy client IP for rate limiting.
5. **Phase B — Companion Plugin extraction:** separate plugin + theme emitters, two ZIPs, plugin versioning; `src/server/{plugin,theme}` split (legacy flat folder = theme + deprecation warning); declarative `redirects`; migrate `hospitality`, `hotelchecker24`, `forge-commerce`, `forgewp-auth` and verify live.
6. **Phase D:** cross-mode parity CI (Native via cloud sandbox / LocalWP vs. Decoupled Next.js).

### Shared files (edit with care, small appends only)
- `FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md` — both agents append; never rewrite the other agent's items.
- `docs/dual-mode-portability-architecture.md` — append-only; Section 9 changes need founder approval.
- `docs/resource-contracts.md` — see Section 3.
- Root `package.json`, lockfiles, `tsconfig*` — change only when required, and say so in the handoff note.

---

## 2. Ground Rules

1. **Own branch, small PRs.** Each agent works on its own branch, merges latest `main` into it before every push, and keeps PRs focused (one assignment per PR where practical).
2. **Stay in your lane.** If you find a bug in a file the other agent owns:
   - **Tiny + isolated** (a few lines, no API/shape change): fix it, add a test, and call it out in your handoff note.
   - **Anything bigger:** don't fix it — log it in the improvement brief and mention it in your handoff note so the owner picks it up.
3. **Contracts first.** Never change a resource's JSON shape unilaterally (Section 3).
4. **Founder merges.** Only the founder merges to `main` (or explicitly instructs an agent to).
5. **Don't break the migration suite.** Changes must keep `projects/*` building; if a breaking change is intentional (approved in Section 9), migrate the affected projects in the same PR.
6. **Tests with every fix.** Add or update focused unit / compiler / PHP regression tests; run `php -l` on emitted PHP when PHP emitters change.

---

## 3. Resource Contracts (the meeting point)

Each resource's JSON shape is defined once in **`docs/resource-contracts.md`** (to be created with the first pilot). The PHP REST response and the PHP hydration payload (Claude) and the runtime sources / hooks (Gemini) must all match it exactly.

**Process for each resource:**
1. One agent drafts the contract entry (route, auth, params, response JSON example, cache tags, error shape).
2. Founder approves (relaying between agents as needed).
3. Both agents implement their side in parallel against the approved contract.
4. Native-vs-Decoupled payload parity is verified in the cloud sandbox before the resource is marked done.

**Pilot order:** `site-settings` → `forms` → (Phase C) menus/routes, i18n, editables, SEO, auth/me, WooCommerce.

---

## 4. Fix-or-Document Policy (applies to BOTH agents, during ALL work)

While working, you will find faults, gaps, and opportunities to improve existing features. Handle every finding with this policy:

### Fix it now if it is:
- A clear bug, regression, compiler edge case, broken PHP/markup output, CSS leak, hydration mismatch, wrong default, misleading error message, or doc inaccuracy;
- **and** the fix is small, backward-compatible (or an approved Section 9 breaking change), and inside your owned files (or tiny + isolated per Rule 2).

Then: add/update a focused test, verify (live in the sandbox when behavior is WordPress-facing), and list it in your handoff note.

### Document it if it needs serious engineering:
Anything that needs design decisions, breaking API/schema changes, security trade-offs, cross-package coordination, or more than roughly a day of work goes into **`FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`**, following `.github/skills/framework-improvement-brief/SKILL.md`:

- **Observed behavior** — what happens today, with exact source paths (and live repro steps if seen in WordPress).
- **Why it matters** — impact on Native, Decoupled, one-click switching, security, editorial UX, or DX.
- **Suggested improvement** — a bounded direction, not an assumed implementation.
- **Acceptance criteria** — observable behavior + how to verify.

Check the brief for duplicates first and update existing items instead of adding new ones. Separate verified behavior from inference. Retain completed items and tick checkboxes only when genuinely verified.

### Proactively suggest improvements
Even when nothing is broken, note DX/UX friction (confusing errors, awkward wp-admin flows, manual glue, missing defaults). Small wins: fix. Larger ideas: brief entry. Mention notable ones in the handoff note.

---

## 5. Handoff Note (end of every work session)

The agents cannot talk to each other; the founder relays. End every session with a note in this format (post it in chat; optionally append to the PR description):

```markdown
### Handoff — <agent> — <date>
**Branch / PR:** <branch> / <PR link or "not opened">
**Done:** <bullets: what changed, files, tests run + results>
**Fixed along the way:** <bugs fixed outside the main assignment, incl. any tiny fixes in the other agent's files>
**Logged to improvement brief:** <item titles>
**Contracts:** <drafted / changed / needs approval>
**Needs from the other agent:** <specific asks, or "none">
**Blocked on founder:** <decisions needed, or "none">
**Next:** <what this agent does next>
```

---

## 6. Environments

- **Gemini:** founder's local machine (LocalWP + headed Chrome via `scripts/wp-e2e-browser.mjs --headed`).
- **Claude:** cloud container with the Docker sandbox — `scripts/cloud-e2e/sandbox.sh up` (WordPress latest + MariaDB + Mailpit at `localhost:8080` / `localhost:8025`), headless Chromium; results shared as screenshots + a private gallery link.
- Both follow `.github/skills/wordpress-e2e-acceptance/SKILL.md` for live verification and never claim a live check passed without running it.
