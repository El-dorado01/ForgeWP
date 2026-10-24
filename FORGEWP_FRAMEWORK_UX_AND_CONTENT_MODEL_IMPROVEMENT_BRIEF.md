# ForgeWP Auth Improvement Pass

Scope: Auth package, generated WordPress endpoints/settings, CLI scaffolds, local preview, and Auth documentation. Core implementation work is closed; WooCommerce remains separate. WordPress acceptance testing is deferred.

## Initial findings and progress

- [x] Corrected the Auth transpilation runner's removed compiler import, outdated REST route grouping assertions, and assertions referring to nonexistent global login-policy/mail-log functions. The updated checks describe the current REST login policy and verification mail output; they do not establish live authentication security.
- [x] Updated the export fixture to author a real protected Page component. The renderer refreshes discovery caches, so writing a cache file alone no longer creates a template. Native junction creation replaces a Windows shell-only command and tolerates an existing fixture link.
- [x] Put Auth package export types first and added .js relative source specifiers for NodeNext consumers. Auth package typecheck passes under Bundler and NodeNext.
- [x] Corrected initial published Auth examples to use WpAuthProvider, useWpAuth, WpLoginForm, WpAuthGate and WpCapabilityGate. Removed unsupported ProtectedRoute, redirectTo, isAuthenticated and automatic nonce-refresh guarantees. Corrected signup exercise text so auto-login depends on configured policy.

## Remaining audit and implementation order

1. Inventory every public Auth value/type, provider prop, hook result, generated endpoint, admin option and scaffold; replace the short hard-coded documentation placeholders with source-backed beginner guides and checked examples. Owner: sibling forgewp-docs/scripts/compile-docs.ts, packages/auth/src, compiler templates/auth and functions/rest-endpoints.js.
2. Trace local mock, provider-backed, standalone, cookie and optional JWT behavior for login/logout/session restoration. Record reproducible differences before changing behavior. The confirmed home-URL subdirectory mismatch is fixed in the login/logout follow-up below. Remaining parity checks include environment-option precedence, initialization/SSR, mock role capabilities, and optional JWT recovery.
3. Audit registration/default-role/metadata ownership, verification-token lifecycle and resend behavior, password recovery/reset, mail failures and configuration validation against generated PHP. Establish executable PHP tests; string generation assertions alone cannot prove these flows.
4. Audit endpoint permission checks, request origins, cookies/nonces and redirect validation. Client UI gates and decoded JWT display state must not be documented as backend authorization. Inspect implementation before claiming any security defect or complete protection.
5. Add practical Auth recipes and exercises after behavior and public contracts are verified. Keep local simulations distinct from WordPress account creation and delivery.
6. Deferred WordPress acceptance: cookies/session persistence, roles, protected Pages, email delivery, verification/reset expiry and single use, error recovery and deployment-specific origins/caching.

This is an initial scoped audit, not an assertion that Auth is complete. Retain checked fixes and add source-backed findings as work proceeds.

Initial verification: the existing Auth transpilation runner now passes, including gate SSR/PHP generation and protected Page export. Auth Bundler and NodeNext typechecks pass. Documentation compilation/typecheck and the existing 17 core examples/260-link regression checks pass; those core checks do not yet typecheck the new Auth example. Auth-specific published-example checks remain part of the next documentation inventory. No live WordPress authentication or email delivery has been tested.

## Auth chapter 1: setup and session foundations

- [x] Replaced the hard-coded introductory Auth placeholders with Markdown guides under `forgewp-docs/content/auth/`: overview, installation/first login, and sessions/local preview. Existing overview/session route IDs are retained; installation is a new page. Auth source files are excluded from the core section scanner.
- [x] Corrected the introductory example again after checking actual hook return values: `useWpAuth()` provides actions/status and does not return user; `useWpUser()` provides the user. The complete provider/form/user/logout example is now included in the published TypeScript checks through the real Auth source entry.
- [x] Added explanations of provider scope, mock versus WordPress accounts, capability versus role, installed admin settings, cookie-mode reloads, and optional JWT backend responsibility. No automatic nonce-refresh or local-to-server authentication guarantee.
- [x] Extended documentation link verification to Auth pages as well as core.
- [ ] Finish the complete Auth API/options/endpoint/scaffold inventory and deeper session parity audit. The three introductory chapters do not complete the remaining registration, recovery, protection, reference, recipe, and practice work.

Verification: Auth introduction example passes against source types as part of 18 published examples; docs compilation/typecheck and the core public coverage audit pass. Existing 94 generated routes remain unique. No Auth runtime changes or live WordPress checks were made in this chapter. Detailed session parity findings remain pending reproduction.

## Auth login/logout and session follow-up

- [x] Fixed standalone API calls dropping the WordPress home subdirectory. Both paths now use its pathname for same-origin calls; explicit API bases and home paths use shared trailing-slash normalization in `packages/auth/src/session-url.ts`. Existing provider process-environment aliases are preserved; a complete resolver unification is not claimed.
- [x] Both cookie logout implementations now check HTTP success before clearing user state/reloading. Rejected responses and network failures retain the current user and update error state. A fresh logout clears the prior error; mock and JWT-local logout behavior is preserved.
- [x] Added `test/functions/auth-session.test.js`: production bundles execute against a small React-state harness with fetch mocks. Eight tests cover both paths, root/subdirectory/malformed home values, explicit trailing slashes, failed login, rejected/non-JSON/unreachable logout, and successful logout. This checks action logic, not mounted-browser lifecycle or real cookies.
- [x] Added the Markdown Login & Logout guide with complete built-in/custom form examples, actual action signatures, failure feedback, navigation behavior, and subdirectory API configuration. Both examples are included in published TypeScript checks.
- [ ] Registration/default-role/metadata and verification flows remain next; full JWT/provider/standalone initialization parity and live WordPress acceptance remain open.

Follow-up verification: all 8 new session action tests, the existing full Auth transpilation/protected-Page export runner, Auth NodeNext typecheck, documentation compilation/typecheck, 20 published examples, and 263 internal links passed; 95 routes remain unique. Live WordPress/mail/browser acceptance is deferred. The existing production documentation build font-fetch limitation remains unchanged.

## Auth sidebar chapter structure

- [x] Split the existing Auth guides into Getting Started (overview, installation), Sessions & Login (sessions, login/logout), and Access Control (existing gate introduction). These are expandable chapters under the shared Guides navigation; Recipes and Practice remain separate. Updated links to the moved session page. No empty future chapters were added. Existing getting-started and access-control section IDs remain; session and login pages now belong to auth-sessions.

## Registration and verification audit/fixes

- [x] Fixed verification sign-in bypass: the generated endpoint previously allowed an already-verified user ID to proceed without a matching transient token. It now always requires a matching token and existing user before consuming the token, writing verification state, or setting the auth cookie. PHP tests reject invalid/mismatched/deleted-account/replayed tokens and accept a valid token once.
- [x] Replaced arbitrary public signup metadata writes with explicit developer-approved `auth.registrationMetaFields` (default empty). Config loading and PHP generation validate unique lowercase identifiers and reject role/capability/session/ForgeWP-owned keys. Unsupported request keys and nested values are rejected before account creation; approved scalar profile values are sanitized. Role assignment stays server-owned. Provider mock metadata is nested rather than spread over IDs/roles.
- [x] Signup without automatic login now returns explicit requiresVerification alongside success. Provider and standalone clients accept successful account creation without requiring a signed-in user payload. Tests cover both verification enabled and disabled responses.
- [x] Added Registration & Verification as a separate expandable chapter, with registration/default-role and email-verification/resend guides. The ready-made registration example is included in published type checks.

### Remaining source-backed findings from this pass

- [x] Registration preview parity (shared signup behavior implemented; real WordPress validation remains separate): provider and standalone mocks now share disabled-registration/duplicate checks, role/capability assignment, approved scalar metadata, email-only username generation, verification-token/mail-log creation, and configured auto-login decisions. Source: auth/src/components.tsx register versus auth/src/hooks.ts register. Development-only public policy is projected from wp.config.ts without server mail content. Focused bundle tests cover both paths; full WordPress sanitization and browser lifecycle are not simulated.
- [x] Verification mail outcomes: signup preserves account-created success and returns a verificationEmailSent flag plus truthful message; the hook exposes registration feedback through notice, rendered by WpRegisterForm. Resend returns a 502 error when transport fails, preserving retry. Source: compiler/lib/functions/rest-endpoints.js. Executable PHP tests cover signup mail failure and failed/successful resend; bundle tests cover notice delivery. Successful transport is not claimed as inbox delivery.
- [ ] Token resend lifecycle: resend creates additional tokens without revoking older unused ones. Decide the resend policy explicitly and test old/new links, expiry and simultaneous redemption; the current guide states the implemented per-token expiry/use behavior.
- [x] Auto-login failure: signup now checks wp_signon before setting the current user or returning a user payload. A failed sign-in preserves account-created success and asks the visitor to sign in; an executable PHP test verifies no current user/session is claimed.

Live WordPress acceptance remains deferred. These focused fixes are not a complete endpoint-security audit; origin/cookie/nonce/rate-limit behavior and the remaining recovery/session cases still require their own pass.

Verification for registration/verification: 16 focused PHP/client session tests passed after the final auto-login fix; the public API/config-loading suites passed in the broader run. Existing Auth transpilation and protected-Page export passed. Auth NodeNext and documentation typechecks passed, along with 21 published examples, 264 internal links, the public core coverage audit, and scoped whitespace checks (97 unique routes). No live accounts, mail transport or WordPress database were used; PHP tests use stand-ins for WordPress functions.

## Auth guide teaching and presentation pass

- [x] Enriched all six existing Markdown Auth guides with contextual tips/notes, setup expectations, decision/outcome tables, and recovery guidance. Added four Mermaid flows (architecture, cookie login, registration, verification) and a React-to-generated-PHP gate comparison grounded in the existing gate transpilation checks.
- [x] Preserved source-backed distinctions: mock versus WordPress sessions, account creation versus sign-in, request completion versus delivery, and content gates versus endpoint authorization. No new runtime capabilities are implied.
- [x] Documentation compilation/typecheck and 21 published examples/264 internal links pass (97 unique routes). Diagram syntax and compiled component counts are checked separately below. Existing live WordPress and runtime follow-ups remain pending.

Presentation verification: generated Auth data contains 12 alert components, one comparison, and four Mermaid blocks. Standalone Node Mermaid parsing could not complete because its DOMPurify dependency requires browser DOM support; no rendered-browser or diagram-parser pass is claimed. No runtime or app security settings were changed.

## Registration preview and mail-feedback follow-up

- [x] Added shared `auth/src/registration-preview.ts` and development-only public policy injection via the Vite virtual runtime. Config edits reload the preview; production output omits this policy. Private email subjects/bodies are excluded.
- [x] Added optional context notice state and stable `useWpAuth().notice` output for account-created instructions, separate from errors. Existing boolean register semantics are preserved. Updated signup/session/verification guides and a typechecked SignupStatus example.
- [ ] Verification resend policy/expiry/race review remains open: issuing a new token currently does not revoke older unused tokens. Password recovery/reset, deeper deployment/security checks, and live WordPress acceptance remain separate pending work.

Follow-up verification (2026-10-24): all 42 focused Auth/registration/PHP/preview/virtual-runtime/config tests passed. Existing Auth transpilation and protected-page export checks passed. Framework and Auth NodeNext typechecks, documentation compilation/typecheck, 22 published examples, 264 internal links, 97 unique routes, and scoped whitespace checks passed. Tests execute generated PHP against stand-ins and production/development bundles against a state harness; live WordPress/mail delivery and rendered-browser acceptance remain deferred.

## Password recovery and reset

- [x] Replaced the built-in WpPasswordResetForm preview-only success message with the real forgotPassword hook path, so mock requests produce usable reset tokens and preview mail-log records. The form reports hook errors and supports provider or browser standalone state.
- [x] Added shared preview reset-token consumption. Empty passwords, mismatched accounts, invalid/non-string tokens and malformed stores fail without consuming a valid token. A valid token is consumed once. This does not change password hashes or enforce WordPress expiry in the preview.
- [x] Made standalone hook initialization safe when no browser window exists, required by server-rendering the recovery form through the common action path.
- [x] Added input-type checks for generated recovery/reset endpoints. Non-string account/key/password values are rejected before WordPress handlers. Real key checks and password writes remain delegated to WordPress.
- [x] Added a Password Recovery chapter with request/reset guides, diagrams, outcome tables and complete typechecked examples. Built-in form naming is explained: it requests a link, not a new password.
- [ ] Live acceptance remains deferred: real expiry/single-use keys, new-credential login, mail transport, frontend reset URL routing, cookies and plugin password rules.

New evidence to retain: password recovery currently exposes WordPress account/delivery errors rather than a uniform account-existence response. Preview tokens have no real expiry and do not replace mock login credentials. Future origin/rate-limit/privacy review must assess the desired public recovery contract before claiming account-enumeration protection.

Recovery/reset verification: 34 focused Auth session/registration/password tests passed, including a built-in recovery form action test and no-window render test. Generated PHP tests use WordPress stand-ins to verify call ordering and error paths, not actual WordPress expiry or password hashing. Existing Auth transpilation/protected-page export and Auth NodeNext typecheck passed. Documentation compilation/typecheck, 24 published examples, 266 links and 99 unique routes passed. Scoped whitespace checks passed; live WordPress and browser visual acceptance remain pending. Next documentation chapter: protected pages and capability gates.

## Publication validation and docs UI fixes

- [x] Fixed desktop/mobile Markdown copy: awaited clipboard, fallback, truthful failure state; Mermaid blocks included. Auth overview comparison stacks on desktop through an explicit layout option. Docs production build passed with external font fetching allowed; earlier font-fetch limitation no longer applies to this validation run.
- [ ] Broad framework validation: 435 tests passed in the initial functions/blocks run, but the public type suite and tier3 real-components setup timed out under load. Public type tests passed on retry with one worker. The tier3 fixture still timed out at its explicit 180-second setup limit; 23 tests did not execute. This is an unresolved verification limitation, not a claimed assertion failure or a green full suite. Source: packages/compiler/test/blocks/tier3-real-components.test.js. Investigate fixture setup/performance and rerun before claiming complete regression coverage.
- [ ] Hosted/browser acceptance remains pending. Static generated Auth HTML contains article content without scripts, supporting direct page extraction; no claim is made that an AI given one URL automatically crawls the whole site.
