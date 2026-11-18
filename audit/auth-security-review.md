# Auth request security review — 16 November 2026

Scope: generated ForgeWP Auth REST routes, their React callers, and protected-page redirects. WooCommerce endpoints, third-party JWT plugins, live WordPress behavior and deployment acceptance are separate.

## Findings and changes

| Area | Finding and resulting behavior | Local evidence |
| --- | --- | --- |
| Write permissions | All eight Auth POST routes previously used unrestricted permission callbacks. They now require JSON, compare browser origins against configured WordPress home/site and optional frontend origins, and reject untrusted Fetch Metadata when origin/referrer is absent. Public account-entry handlers still require their credentials or bearer keys. | Executed generated PHP permission callbacks through a dispatch stand-in; foreign, lookalike, downgraded, wrong-port, opaque and malformed origins fail before handler dispatch. Form/text content types fail with 415. |
| Cookie logout | The public callback called `wp_logout()` without its own nonce/session requirement, and both clients omitted `X-WP-Nonce`. Logout now requires the current WordPress user and their valid REST nonce. Both client paths send JSON, the hydrated nonce and same-origin credentials. | PHP permission tests reject guest/missing/invalid nonce cases; client tests cover global and JSON-script nonce sources; mounted Chrome verifies nonce-bearing logout and retained state on rejection. |
| Verification before sign-in | The login handler checked verification after `wp_signon()`, although core can already issue a cookie at that point. The policy now runs in a scoped `authenticate` filter before cookie issuance. The filter is removed in `finally`, and existing authentication errors are preserved. | Executed the generated login/filter code against a core-ordering stand-in: blocked users produce no cookies/current user; verified users and the explicitly disabled blocking policy work; rejected credentials do not create cookies; the temporary filter is removed. |
| Redirects | Login used its third argument directly in `window.location.href`, allowing executable schemes or external destinations if a caller forwarded untrusted input. Both paths now validate before authenticating and accept only HTTP(S) targets on the current frontend origin. | Provider/standalone production and preview tests reject script/data schemes, foreign/protocol-relative URLs, URL credentials, backslash-host variants and controls; same-origin paths/query/fragments work. Chrome confirms script-scheme rejection without an authentication request. |
| Input shapes | Some public handlers passed arrays or objects to string sanitizers, `trim()` or integer conversion. Login/signup/verification/resend now reject malformed field types before side effects. Recovery/reset already had string-field checks. | PHP tests cover malformed signup, resend and verification fields; login malformed-input tests run before account/session operations. |
| Abuse controls | No generated Auth request limiter existed. Per-peer transient buckets now throttle login, signup/register, shared recovery/resend mail, verification and reset attempts. A WordPress filter permits site-owner tuning or explicit opt-out for external enforcement. | PHP tests verify thresholds, shared aliases, peer/action isolation, expiry, retry metadata, hashed keys and ignored spoofed forwarding headers. |
| Reads and authorization | `/config` remains public with two UI-policy fields. `/me` uses WordPress's resolved current user; WordPress REST cookie auth needs a nonce to retain that identity. Signup role selection stays server-owned and metadata stays allowlisted. UI gates and JWT display claims are not authorization. | Existing registration and gate regressions plus route inventory; inspected the current-user payload path and generated admin capability checks. |
| Protected-page redirects | Generated page protection already uses `wp_safe_redirect()` with theme-owned destinations and server-side login/capability checks. No request-supplied redirect parameter was found in those generated handlers. | Inspected `packages/compiler/lib/generate-theme.js`; existing Auth transpilation/protected-page export checks exercise generated protection. |

Implementation: `packages/compiler/lib/functions/rest-endpoints.js`, `packages/auth/src/session-url.ts`, `packages/auth/src/components.tsx`, `packages/auth/src/hooks.ts`.

Regression entry points: `test/functions/auth-security.test.js`, `auth-session.test.js`, `auth-registration.test.js`, `auth-password.test.js`, and `npm run test:auth-browser` from `packages/compiler`. Browser checks use actual React in an isolated profile with a local stand-in API; generated-PHP checks use WordPress function stand-ins, not an installed WordPress site.

## Remaining decisions and deployment acceptance

- Recovery now returns identical success payloads for nonempty identifiers across account lookup and delivery outcomes. WordPress errors are available only through the server-side `forgewp_auth_recovery_error` action. Input/permission/throttle errors remain public. Execution timing and other WordPress/plugin routes are not covered by this response contract.
- The origin guard is browser request-forgery mitigation, not client identity. Non-browser clients can supply origin headers; handlers must continue validating credentials, reset/verification tokens and permissions.
- Transient increments are not atomic and are not a distributed attack defense. Configure trusted proxy handling and an edge/WAF or security plugin; test concurrent traffic and shared NAT behavior. Raw forwarding headers are intentionally not trusted.
- Verification transient lookup/delete is not an atomic consume operation. Existing tests establish sequential token reuse rejection; concurrent submissions need live acceptance and a stronger storage/locking contract if strict concurrent single-use is required.
- Verify WordPress's actual REST authentication order, cookie issuance/session revocation, nonce expiry/caching, HTTPS, frontend origins/CORS and reverse proxies on the installed site. Hooks keep same-origin credentials; an origin allowlist is not cross-origin-cookie support.
- Guest REST nonces are not treated as account-entry authentication. Logout requires a signed-in user; expired nonce responses retain local state for recovery rather than reporting successful sign-out.
- The third-party JWT plugin's issuance/validation endpoints are outside the generated route guards and limits. Backend authorization and token revocation remain that integration's responsibility.

## Primary references

- [WordPress REST cookie authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)
- [WordPress cookie authentication and nonce checks](https://developer.wordpress.org/reference/functions/rest_cookie_check_errors/)
- [REST API Origin/CORS behavior](https://developer.wordpress.org/rest-api/frequently-asked-questions/)
- [wp_logout session/cookie behavior](https://developer.wordpress.org/reference/functions/wp_logout/)
- [wp_signon authentication/cookie ordering](https://developer.wordpress.org/reference/functions/wp_signon/)
- [authenticate filter](https://developer.wordpress.org/reference/hooks/authenticate/)
- [wp_safe_redirect](https://developer.wordpress.org/reference/functions/wp_safe_redirect/)
