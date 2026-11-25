/**
 * R9 — hand-written Companion Plugin sources (docs/resource-contracts.md §16).
 *
 * src/server/plugin/
 *   *.php                    flat files, pasted into backend.php (unchanged behaviour)
 *   src/ includes/ templates/ assets/   copied as is into project/ of both backend copies
 *   composer.json + .lock    `composer install --no-dev` at export → project/vendor/
 *
 * Both copies (the <slug>-companion plugin and the theme's companion/ folder)
 * get the same project/ tree; only one copy runs at a time.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { companionConstant } from './companion-plugin.js';

/**
 * On Windows, Composer is a composer.bat / composer.cmd wrapper, which Node can
 * only start through a shell (spawn without one fails with ENOENT). The
 * arguments are fixed values, never user input, so the shell is safe there.
 */
const COMPOSER_SHELL = process.platform === 'win32';

export const COMPANION_TREE_DIRS = ['src', 'includes', 'templates', 'assets'];

/** Never copied (§16.6). Matched against the path relative to src/server/plugin/. */
export const DEFAULT_COMPANION_EXCLUDES = [
  '**/.env*',
  '**/*.key',
  '**/*.pem',
  '**/auth.json',
  '**/tests/**',
  '**/node_modules/**',
  '**/.git*',
  '**/.git/**',
  '**/phpunit.xml*',
  '**/*.md',
  '**/.DS_Store',
];

/** Glob → RegExp: `**` any depth, `*` within one folder, `?` one character. */
export function globToRegExp(glob) {
  let re = '';
  const g = String(glob).replace(/\\/g, '/');
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        // "**/" matches zero or more folders; a trailing "**" matches everything below.
        if (g[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export function makeExcluder(extra = []) {
  const res = [...DEFAULT_COMPANION_EXCLUDES, ...(Array.isArray(extra) ? extra : [])].map(globToRegExp);
  return (rel) => {
    const p = rel.replace(/\\/g, '/');
    return res.some((re) => re.test(p));
  };
}

function walk(dir, base, out) {
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const rel = path.relative(base, abs).replace(/\\/g, '/');
    if (statSync(abs).isDirectory()) walk(abs, base, out);
    else out.push(rel);
  }
  return out;
}

/** Files of the project tree (relative to src/server/plugin/), exclusions applied. */
export function listCompanionTree(pluginSrcDir, exclude = []) {
  const excluded = makeExcluder(exclude);
  const files = [];
  for (const d of COMPANION_TREE_DIRS) {
    const abs = path.join(pluginSrcDir, d);
    if (existsSync(abs) && statSync(abs).isDirectory()) walk(abs, pluginSrcDir, files);
  }
  return files.filter((rel) => !excluded(rel)).sort();
}

const ABSPATH_GUARD = /defined\s*\(\s*['"]ABSPATH['"]\s*\)/;

/**
 * Export-time checks (§16.10 #1, #7). Returns a list of problems; the caller
 * throws so the export stops with every problem listed at once.
 */
export function checkCompanionSources(pluginSrcDir, treeFiles) {
  const problems = [];
  if (existsSync(pluginSrcDir)) {
    for (const name of readdirSync(pluginSrcDir).filter((f) => f.endsWith('.php')).sort()) {
      const code = readFileSync(path.join(pluginSrcDir, name), 'utf8');
      if (/^\s*declare\s*\(\s*strict_types/m.test(code) || /^\s*namespace\s+[A-Za-z_\\]/m.test(code)) {
        problems.push(
          `src/server/plugin/${name}: flat files are pasted into one backend.php, so they cannot use ` +
            '`declare(strict_types=1)` or `namespace`. Move this code into src/server/plugin/src/ (autoloaded classes).',
        );
      }
    }
  }
  for (const rel of treeFiles) {
    if (!rel.endsWith('.php') || rel.startsWith('assets/')) continue;
    const code = readFileSync(path.join(pluginSrcDir, rel), 'utf8');
    if (!ABSPATH_GUARD.test(code.slice(0, 4000))) {
      problems.push(
        `src/server/plugin/${rel}: add \`defined('ABSPATH') || exit;\` near the top (after declare/namespace), ` +
          'so opening the file directly in a browser does nothing.',
      );
    }
  }
  return problems;
}

/**
 * `composer install --no-dev --optimize-autoloader` in a temporary copy, so the
 * project folder is never changed. Returns the path of the built vendor/ (in
 * a temp dir the caller removes), or null when there is no composer.json.
 */
export function buildComposerVendor(pluginSrcDir, treeFiles, { spawn = spawnSync } = {}) {
  const composerJson = path.join(pluginSrcDir, 'composer.json');
  if (!existsSync(composerJson)) return null;
  if (!existsSync(path.join(pluginSrcDir, 'composer.lock'))) {
    throw new Error(
      '[ForgeWP] src/server/plugin/composer.json has no composer.lock. Run `composer update` in src/server/plugin/ ' +
        'and commit composer.lock, so every export installs the same library versions.',
    );
  }
  const probe = spawn('composer', ['--version'], { encoding: 'utf8', shell: COMPOSER_SHELL });
  if (probe.error || probe.status !== 0) {
    throw new Error(
      '[ForgeWP] src/server/plugin/composer.json needs Composer, which is not installed (or not on PATH). ' +
        'Install it from https://getcomposer.org/download/ and export again.',
    );
  }
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-composer-'));
  cpSync(composerJson, path.join(tmp, 'composer.json'));
  cpSync(path.join(pluginSrcDir, 'composer.lock'), path.join(tmp, 'composer.lock'));
  // The optimized autoloader scans the PSR-4 folders, so they must be there.
  for (const rel of treeFiles) {
    mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    cpSync(path.join(pluginSrcDir, rel), path.join(tmp, rel));
  }
  const run = spawn(
    'composer',
    ['install', '--no-dev', '--prefer-dist', '--optimize-autoloader', '--no-interaction', '--no-progress', '--no-scripts'],
    { cwd: tmp, encoding: 'utf8', shell: COMPOSER_SHELL, env: { ...process.env, COMPOSER_NO_AUDIT: '1' } },
  );
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (run.status !== 0) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(`[ForgeWP] composer install failed in src/server/plugin/:\n${output.trim()}`);
  }
  if (/lock file is not up to date/i.test(output)) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(
      '[ForgeWP] src/server/plugin/composer.lock is out of date with composer.json. Run `composer update` ' +
        'in src/server/plugin/ and commit composer.lock.',
    );
  }
  stripSourceInstalls(path.join(tmp, 'vendor'));
  return { vendorDir: path.join(tmp, 'vendor'), cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

/**
 * When Composer cannot download a release zip it clones the package instead,
 * which brings its .git folder and everything the release zip leaves out
 * (tests, CI files). Do what the release zip would have done: remove the
 * paths the package marks export-ignore in .gitattributes, and .git itself.
 */
export function stripSourceInstalls(vendorDir) {
  if (!existsSync(vendorDir)) return [];
  const stripped = [];
  for (const vendor of readdirSync(vendorDir)) {
    const vendorPath = path.join(vendorDir, vendor);
    if (vendor === 'bin' || vendor === 'composer' || !statSync(vendorPath).isDirectory()) continue;
    for (const pkg of readdirSync(vendorPath)) {
      const root = path.join(vendorPath, pkg);
      if (!statSync(root).isDirectory() || !existsSync(path.join(root, '.git'))) continue;
      const attributes = path.join(root, '.gitattributes');
      if (existsSync(attributes)) {
        for (const line of readFileSync(attributes, 'utf8').split(/\r?\n/)) {
          const m = line.trim().match(/^(\S+)\s+.*\bexport-ignore\b/);
          if (!m) continue;
          const rel = m[1].replace(/^\/+/, '');
          // Plain paths only (what packages use in practice); never leave the package folder.
          if (rel === '' || /[*?[]/.test(rel) || rel.split('/').includes('..')) continue;
          rmSync(path.join(root, rel), { recursive: true, force: true });
        }
      }
      rmSync(path.join(root, '.git'), { recursive: true, force: true });
      stripped.push(`${vendor}/${pkg}`);
    }
  }
  return stripped;
}

/** Copies the project tree (+ vendor/) into <destBackendDir>/project/. */
export function writeCompanionTree(pluginSrcDir, treeFiles, destProjectDir, vendorDir) {
  rmSync(destProjectDir, { recursive: true, force: true });
  if (treeFiles.length === 0 && !vendorDir) return;
  for (const rel of treeFiles) {
    const dest = path.join(destProjectDir, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(pluginSrcDir, rel), dest);
  }
  if (vendorDir) cpSync(vendorDir, path.join(destProjectDir, 'vendor'), { recursive: true });
  // No directory listings if the host allows them.
  writeFileSync(path.join(destProjectDir, 'index.php'), "<?php\n// Silence is golden.\n");
}

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * PHP that starts backend.php (§16.10 #4): constants → vendor autoload →
 * companion.autoload loader → upgrade check. The generated backend and the
 * flat files follow it.
 */
export function buildCompanionPreludePhp(config, { hasVendor }) {
  const c = companionConstant(config.slug);
  const autoload = config.companion && config.companion.autoload && typeof config.companion.autoload === 'object'
    ? Object.entries(config.companion.autoload)
    : [];
  const lines = [];
  lines.push(`
/**
 * ── Companion project files (src/server/plugin/{src,includes,templates,assets}) ──
 * ${c}_DIR / ${c}_URL point at project/ of whichever copy runs (both end with /).
 */
if (!defined('${c}_DIR')) {
    if (defined('${c}') && ${c} === 'plugin') {
        define('${c}_DIR', dirname(__DIR__) . '/project/');
        define('${c}_URL', plugins_url('project/', dirname(__DIR__) . '/index.php'));
    } else {
        define('${c}_DIR', __DIR__ . '/project/');
        define('${c}_URL', trailingslashit(get_template_directory_uri()) . 'companion/project/');
    }
}`);
  if (hasVendor) {
    lines.push(`
if (file_exists(${c}_DIR . 'vendor/autoload.php')) {
    require_once ${c}_DIR . 'vendor/autoload.php';
}`);
  }
  if (autoload.length > 0) {
    const map = autoload
      .map(([prefix, dir]) => {
        const p = String(prefix).replace(/^\\+/, '').replace(/\\*$/, '\\');
        const d = String(dir).replace(/^\.?\/*/, '').replace(/\/*$/, '/');
        return `        ${phpString(p)} => ${phpString(d)},`;
      })
      .join('\n');
    lines.push(`
spl_autoload_register(function ($class) {
    static $map = array(
${map}
    );
    foreach ($map as $prefix => $dir) {
        if (strncmp($class, $prefix, strlen($prefix)) === 0) {
            $file = ${c}_DIR . $dir . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) {
                require_once $file;
            }
            return;
        }
    }
});`);
  }
  lines.push(`
/**
 * forgewp_companion_upgraded( $from, $to ): once, on the first request after the
 * backend's version changes (whichever copy runs). Not fired on a first install
 * (forgewp_companion_activated covers that).
 */
add_action('init', function () {
    $key = 'forgewp_companion_${String(config.slug).replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}_version';
    $to = defined('${c}_VERSION') ? (string) ${c}_VERSION : '';
    $from = (string) get_option($key, '');
    if ($from === $to || $to === '') {
        return;
    }
    if (!add_option($key . '_lock', time(), '', false)) {
        $since = (int) get_option($key . '_lock', 0);
        if ($since > time() - 60) {
            return;
        }
        update_option($key . '_lock', time(), false);
    }
    update_option($key, $to, true);
    if ($from !== '') {
        do_action('forgewp_companion_upgraded', $from, $to);
    }
    delete_option($key . '_lock');
}, 1);
`);
  return lines.join('\n');
}

/** uninstall.php for the standalone plugin (§16.5, §16.10 #5). */
export function buildCompanionUninstallPhp(config) {
  const c = companionConstant(config.slug);
  const key = `forgewp_companion_${String(config.slug).replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}`;
  return `<?php
/**
 * Runs when the ${config.name || config.slug} Companion plugin is deleted in wp-admin.
 * Generated by ForgeWP — do not edit; re-export the project instead.
 *
 * Data is kept unless the site owner opted in, because the theme's built-in copy
 * of the backend keeps serving it: define('FORGEWP_COMPANION_DELETE_DATA', true)
 * in wp-config.php.
 */
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}
if (!(defined('FORGEWP_COMPANION_DELETE_DATA') && FORGEWP_COMPANION_DELETE_DATA)) {
    return;
}
// The ForgeWP theme's copy may already run (it does when the theme is active):
// loading this plugin's copy too would declare every function twice.
if (!defined('${c}')) {
    define('${c}', 'plugin');
    define('${c}_VERSION', ${phpString(config.version || '0.0.0')});
    require_once __DIR__ . '/includes/backend.php';
}
do_action('forgewp_companion_uninstall');
delete_option('${key}_version');
delete_option('${key}_version_lock');
`;
}
