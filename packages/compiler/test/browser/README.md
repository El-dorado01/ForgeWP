# Local Auth browser checks

Run `npm run test:auth-browser` from `packages/compiler` with workspace dependencies installed. Set `CHROME_PATH` if Chrome/Chromium is not at one of the runner's standard Windows/Linux paths.

The runner builds the actual Auth source, starts an isolated loopback API, and opens a temporary headless Chrome profile. It covers both provider and standalone consumers:

- Generated-session HTML hydration, rejected/successful cookie actions, nonce-bearing logout, gate updates and reloads.
- Unsafe login redirects rejected before sending credentials or executing a URL scheme.
- JWT validation, invalid/expired/rejected tokens, unreachable validation and recovery on reload, and local logout.
- Development-preview login, role capabilities, persisted sessions, logout and reload.
- React StrictMode mounting with browser exceptions and hydration errors treated as failures.

Results and screenshots are written to `.forgewp/browser-qa/` at the repository root. The API is a test stand-in; it does not validate a live WordPress installation, real cookies, backend permissions, or mail delivery.

The sibling docs repository's `npm run check:browser` reuses `chrome.mjs` against a running local docs server. `DOCS_BROWSER_ORIGIN` selects its loopback origin; `FORGEWP_FRAMEWORK_ROOT` selects the framework checkout. It checks desktop/mobile navigation and layout, Auth page diagrams, theme switching and simulated clipboard success/fallback/failure/retry. It writes results and screenshots to the docs repository's `scratch/browser-qa/` directory.
