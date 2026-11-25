# Releasing ForgeWP to npm

Releases are published by GitHub Actions with npm **trusted publishing**:
GitHub proves to npm which repository and workflow is publishing, so no npm
token is stored anywhere and nobody logs in to npm on their own machine.

There are two parts:

- **Part A, once:** connect each npm package to this repository's release workflow.
- **Part B, every release:** prepare the version numbers, then click **Run workflow**.

---

## Part A: one-time setup on npmjs.com (about 10 minutes)

Do this once for **each** of the 7 packages:

| Package | Page |
| --- | --- |
| `@forgewp/react` | https://www.npmjs.com/package/@forgewp/react |
| `@forgewp/ui` | https://www.npmjs.com/package/@forgewp/ui |
| `@forgewp/compiler` | https://www.npmjs.com/package/@forgewp/compiler |
| `@forgewp/plugin-seo` | https://www.npmjs.com/package/@forgewp/plugin-seo |
| `@forgewp/auth` | https://www.npmjs.com/package/@forgewp/auth |
| `@forgewp/woocommerce` | https://www.npmjs.com/package/@forgewp/woocommerce |
| `create-forgewp` | https://www.npmjs.com/package/create-forgewp |

For each package:

1. Sign in at https://www.npmjs.com (account `eldorado01`).
2. Open the package's page from the table above.
3. Click the **Settings** tab, in the row of tabs below the package name
   (next to *Readme*, *Code*, *Dependencies*, *Versions*). You only see it
   while signed in as an owner.
4. Scroll to the **Trusted Publisher** section and click **GitHub Actions**.
5. Fill in the form exactly like this:

   | Field | Value |
   | --- | --- |
   | Organization or user | `El-dorado01` |
   | Repository | `ForgeWP` |
   | Workflow filename | `release.yml` |
   | Environment name | *(leave empty)* |

6. Click **Set up connection** (the button at the bottom of the form). npm may
   ask for your two-factor code.
7. Go back to the table and do the next package.

> Letters must match exactly: `El-dorado01` with a capital E, `ForgeWP` with
> capitals F, W and P, and the file name `release.yml` only, without the
> `.github/workflows/` folder in front.

### Afterwards, once (creates the `v0.6.0` tag)

1. Open https://github.com/El-dorado01/ForgeWP/actions/workflows/release.yml
   (or: the repository → the **Actions** tab at the top → **Release to npm** in the
   list on the left).
2. On the right, above the list of runs, click the grey **Run workflow** button.
3. A small box opens. Leave **Branch: main**. **Untick** *Dry run*.
4. Click the green **Run workflow** button in that box.
5. After a few seconds a new run appears in the list (refresh the page if it
   doesn't). It takes about 5 minutes. A green tick means it worked. Click the
   run to see its summary: nothing new is published (0.6.0 is already on npm),
   and `v0.6.0` is tagged.

---

## Part B: every release

### 1. Prepare the release (Claude can do this for you)

Ask Claude: *"prepare a release"*. It will:

- raise the `version` in the `package.json` of each package that changed (before
  1.0: a minor version such as 0.6 → 0.7 when something breaks; a patch
  version such as 0.6.0 → 0.6.1 for fixes only);
- update the versions that `packages/create-forgewp/template*/package.json`
  install, so new projects get the new release;
- update `pnpm-lock.yaml` and `CHANGELOG.md`;
- test the packages as a new user would, and merge to `main` once CI is green.

### 2. Check what would be published (dry run)

1. Open https://github.com/El-dorado01/ForgeWP/actions/workflows/release.yml
2. Click the grey **Run workflow** button on the right.
3. Leave **Branch: main** and leave **Dry run** **ticked**.
4. Click the green **Run workflow** button.
5. Wait for the green tick (about 5 minutes), then click the run. The summary
   at the top lists each package as *would publish* or *already on npm*.
   Nothing has been published.

### 3. Publish

1. Same page, click **Run workflow** again.
2. This time **untick** **Dry run**. Leave **Publish directly** unticked.
3. Click the green **Run workflow** button.
4. Wait for the green tick. The summary lists the **staged** versions, and the
   commit is tagged `v<version>`.
5. **Approve the staged versions on npm.** They are uploaded but not
   installable until an owner approves them with two-factor (npm calls this
   *staged publishing*; it's what the "npm stage publish" permission on the
   Trusted Publisher allows). Each staged version is approved once; until
   then `npm install` keeps getting the previous version.

> **Publish directly** (the second checkbox) skips the approval step. It only
> works after you change each package's Trusted Publisher permission on npm
> from *npm stage publish* to *npm publish* (**Edit** on the Settings tab).
5. Check on npm: open a package page from the table in Part A. The version
   at the top should be the new one, with a **Provenance** badge showing it
   was built by this repository's workflow.

### If something goes wrong

- **Red cross on a run:** click the run, then the red step, to read the
  error. Most often it's a test that fails; fix it and run again.
- **A run failed halfway:** run it again. Packages already on npm are skipped,
  so nothing is published twice.
- **"Unable to authenticate" / 404 / "not authorized" during publish:** the
  trusted-publisher form in Part A doesn't match for that package. Open its
  Settings tab on npm and check the four fields (capitals included).

### Beta versions

A version with a pre-release part, such as `1.0.0-beta.1`, goes out under the
npm tag `beta`, not `latest`. Everyone running `npm create forgewp` keeps
getting the last stable release. Testers use `npm create forgewp@beta`.

---

## Optional, after the first release through GitHub worked

On each package's **Settings** tab on npm, under **Publishing access**, choose
**Require two-factor authentication and disallow tokens**, then
**Update Package Settings**. From then on, a package can only be published by
this workflow (or by you with two-factor), never with a leaked token.
