# Parity CI (Phase D, R6)

One project, two deployments, one WordPress: `projects/parity-fixture` is exported as a native theme **and** run as a decoupled Next.js app against the same WordPress, and the two must agree.

```bash
scripts/parity/run.sh                  # reuse the cloud sandbox (scripts/cloud-e2e/sandbox.sh)
PARITY_RESET=1 scripts/parity/run.sh   # fresh WordPress first (what CI does)
node scripts/parity/run-parity.mjs --only dom,auth   # compare only, both sides already running
```

Report: `.forgewp/parity/report.json` (plus `next.log`, `debug.log`). CI: `.github/workflows/parity.yml`, uploaded as the `parity-report` artifact.

## Checks

| Check | Fails when |
|---|---|
| `resources` | A native `window.forgeWpHydration.resources.<name>` is not deep-equal to its REST body (`restUrlFor()` maps names to routes; an unmapped resource fails) |
| `dom` | `[data-parity]` text, primary-menu links, HTTP status or `<html lang>` language differ between native and decoupled |
| `form` | The contact form does not succeed in either mode, or the status text differs |
| `auth` | A logged-out visitor is not redirected away from a guarded route, sees its content, or lands somewhere different per mode |
| `locale` | `<html lang>` does not match `i18n.currentLanguage` |
| `debug.log` | WordPress logged a PHP fatal/parse/warning or a `[ForgeWP]` line |

## Adding coverage

- **New element to compare:** add `data-parity="<name>"` to it in the fixture. Both modes must render the same text.
- **New route:** add it to `ROUTES` in `run-parity.mjs` (with `post`/`posts`/`term` so the resource check knows which REST call to compare).
- **New resource:** add its REST route to `restUrlFor()`; the check fails until you do.

## Known gaps

`known-gaps.json` lists triaged differences (id, owner, regex over the failure text, optional routes). Matching differences are reported but do not fail. **A gap that no longer reproduces fails the run**: delete its entry in the PR that fixes it. Never add an entry to make a new regression pass; triage it in `docs/phase-status-and-blog-urls.md` §8 first.
