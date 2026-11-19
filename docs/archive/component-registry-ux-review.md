# Component Registry UX Review

Status: the local ForgeWP component overwrite hazard is fixed. Items below are recommendations for review, not all committed design decisions.

## Shipped Safety Change

- `forgewp add <name>` checks a ForgeWP-local component target before creating `components.json` or invoking shadcn.
- If the local target already exists, the command stops, explains that the file was preserved, and exits without running the installer.
- `forgewp add <name> --overwrite` explicitly permits the local registry copy to replace the existing file.
- The new regression tests cover both preserving an existing customized file and replacing it only when `overwrite` is true.
- This protection is scoped to ForgeWP-local overrides. Upstream shadcn component overwrite behavior remains governed by the shadcn CLI and should be reviewed separately.

## Recommended Improvements

### P1: Make the install plan visible

Before making changes, report the resolved source (`ForgeWP local` or `shadcn`), destination files, dependencies, and CSS/plugin edits. A `--dry-run` option would make the command easier to trust in CI and when onboarding.

### P1: Make installs recoverable

Resolve metadata and dependencies first, then write files only after required steps succeed. If dependency installation or CSS registration fails, report what changed and either roll it back or provide exact recovery steps.

### P1: Define registry dependency metadata

ForgeWP local `registry.json` files have dependency fields, but the current installer primarily processes `tailwindPlugins`. Decide how `dependencies`, `devDependencies`, and `registryDependencies` should be installed, versioned, and reported, then implement and test that contract.

### P1: Define overwrite behavior for upstream components

`forgewp add` delegates to `shadcn add --yes` for upstream components. Verify how the selected shadcn CLI handles an existing target and make the result explicit. The ForgeWP `--overwrite` flag currently governs the local ForgeWP replacement path; avoid implying that it controls upstream behavior unless it is deliberately passed through and tested.

### P2: Distinguish install from update

An idempotent second `add` could report that a component is already installed and offer separate actions for update or replacement. This prevents developers from treating `add` as a component upgrade command and losing local customizations.

### P2: Improve package-manager detection

The current detector recognizes pnpm, Yarn, and `bun.lockb`, then falls back to npm. Review support for current Bun lockfiles and ambiguous monorepo lockfile layouts. Report the detected manager before invoking it.

### P2: Normalize CLI help and option parsing

Document and support consistent forms for options, such as both `--style shadcn` and `--style=shadcn`, plus `--help`. Clarify whether `--overwrite` applies to local entries, upstream entries, or both.

### P2: Add end-to-end registry tests

In addition to unit tests, test a local override, an upstream component, an unavailable component, a pre-existing customized file, explicit overwrite, dependency failure, and CSS plugin registration. Assert that failed installs do not damage existing project files.

## Decisions for Review

1. The current behavior aborts with an actionable message when a local component already exists. Should repeated `add` instead be a no-op with an informational message?
2. Should overwrite create a `.bak` copy, show a diff, or require an interactive confirmation when run in a terminal?
3. Should the CLI support `--dry-run` before or after dependency resolution is implemented?
4. Should local ForgeWP components bypass the shadcn network request entirely once their dependency metadata is complete?
