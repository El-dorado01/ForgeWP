# Releasing ForgeWP to npm

Releases are published by GitHub Actions with npm **trusted publishing**:
GitHub proves to npm which repository and workflow is publishing, so no npm
token is stored anywhere and nobody has to log in to npm on their machine.

## One-time setup (already needed once per package)

On [npmjs.com](https://www.npmjs.com), for **each** of these packages:
`@forgewp/react`, `@forgewp/ui`, `@forgewp/compiler`, `@forgewp/plugin-seo`,
`@forgewp/auth`, `@forgewp/woocommerce`, `create-forgewp`

1. Open the package → **Settings** → **Trusted publishing** → **GitHub Actions**.
2. Fill in:
   - Organization or user: `El-dorado01`
   - Repository: `ForgeWP`
   - Workflow filename: `release.yml`
   - Environment: leave empty
3. Save.

Optional, once the first release through GitHub worked: on the same Settings
page choose **Require two-factor authentication and disallow tokens**, so the
package can only be published by this workflow.

## Making a release

1. Raise the `version` in the `package.json` of each package that changed.
   Before 1.0, use a minor version (0.6 → 0.7) when something breaks.
   - Also update the versions that `packages/create-forgewp/template*/package.json`
     install, so new projects get the new release.
   - Run `pnpm install` so `pnpm-lock.yaml` matches, and add the changes to
     `CHANGELOG.md`.
2. Merge to `main` and wait for CI to pass.
3. GitHub → **Actions** → **Release to npm** → **Run workflow** with
   **Dry run** ticked. The run summary lists what would be published.
4. Run it again with **Dry run** unticked. It publishes every package whose
   version is not on npm yet, in dependency order, and tags the commit
   `v<compiler version>`.

A version with a pre-release part (`1.0.0-beta.1`) is published under its own
npm tag (`beta`), not as `latest`: `npm create forgewp` keeps installing the
last stable release, and testers use `npm create forgewp@beta`.

If a run fails halfway, fix the problem and run it again: packages that are
already on npm are skipped.
