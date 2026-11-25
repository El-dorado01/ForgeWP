#!/usr/bin/env node
/**
 * Publishes the ForgeWP packages to npm, in dependency order.
 *
 * - Skips a package whose version is already on npm, so a re-run after a
 *   partial failure is safe and unchanged packages are left alone.
 * - Packs with pnpm (turns workspace: ranges into real version ranges), then
 *   publishes the tarball with npm and --provenance (trusted publishing from
 *   GitHub Actions: no npm token is stored anywhere).
 * - Pre-releases (1.0.0-beta.1) are published under their own dist-tag (beta),
 *   never as latest.
 * - DRY_RUN=1 packs and runs `npm publish --dry-run` only.
 *
 * Used by .github/workflows/release.yml. Prints the published packages and
 * writes `published=<names>` and `tag=v<compiler version>` to $GITHUB_OUTPUT.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ORDER = ['react', 'ui', 'compiler', 'plugin-seo', 'auth', 'woocommerce', 'create-forgewp'];
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function onNpm(name, version) {
  const r = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() === version;
}

const published = [];
const skipped = [];
const outDir = mkdtempSync(path.join(os.tmpdir(), 'forgewp-release-'));
try {
  for (const dir of ORDER) {
    const pkgDir = path.join(root, 'packages', dir);
    const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    if (pkg.private) continue;
    const id = `${pkg.name}@${pkg.version}`;
    if (onNpm(pkg.name, pkg.version)) {
      console.log(`= ${id} is already on npm, skipped`);
      skipped.push(id);
      continue;
    }
    const before = new Set(readdirSync(outDir));
    execFileSync('pnpm', ['pack', '--pack-destination', outDir], { cwd: pkgDir, stdio: ['ignore', 'ignore', 'inherit'] });
    const tarball = readdirSync(outDir).find((f) => !before.has(f));
    // A pre-release (1.0.0-beta.1) goes out under its own dist-tag (beta), never
    // as latest: `npm create forgewp` keeps installing the last stable release.
    const pre = pkg.version.includes('-') ? pkg.version.split('-')[1].split('.')[0] || 'next' : null;
    const args = ['publish', path.join(outDir, tarball), '--access', 'public', '--provenance', '--tag', pre || 'latest'];
    if (dryRun) args.push('--dry-run');
    console.log(`${dryRun ? '~' : '+'} ${id} → npm tag "${pre || 'latest'}"${dryRun ? ' (dry run)' : ''}`);
    execFileSync('npm', args, { stdio: 'inherit' });
    published.push(id);
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

const compiler = JSON.parse(readFileSync(path.join(root, 'packages', 'compiler', 'package.json'), 'utf8'));
const summary = [
  `## ForgeWP release${dryRun ? ' (dry run)' : ''}`,
  '',
  published.length ? published.map((p) => `- ${dryRun ? 'would publish' : 'published'} \`${p}\``).join('\n') : '- nothing new to publish',
  ...skipped.map((p) => `- already on npm: \`${p}\``),
].join('\n');
console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `published=${dryRun ? '' : published.join(' ')}\ntag=v${compiler.version}\n`);
}
