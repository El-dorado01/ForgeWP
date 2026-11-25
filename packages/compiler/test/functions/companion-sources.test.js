/**
 * R9 — hand-written Companion Plugin sources (docs/resource-contracts.md §16).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import {
  globToRegExp,
  makeExcluder,
  listCompanionTree,
  checkCompanionSources,
  buildCompanionPreludePhp,
  buildCompanionUninstallPhp,
  stripSourceInstalls,
} from '../../lib/companion-sources.js';
import { buildCompanionPluginMainFile, buildThemeCompanionLoaderPhp } from '../../lib/companion-plugin.js';
import { generateTheme } from '../../lib/generate-theme.js';
import { loadConfig } from '../../lib/load-config.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;
const hasComposer = spawnSync('composer', ['--version']).status === 0;
const GUARD = "<?php\ndeclare(strict_types=1);\nnamespace Acme\\Shop;\ndefined('ABSPATH') || exit;\n";

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-r9-'));
}
function write(root, rel, content) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}
function lint(file) {
  const r = spawnSync('php', ['-l', file], { encoding: 'utf8' });
  return r.status === 0 ? '' : r.stdout + r.stderr;
}

describe('globs and exclusions (§16.6)', () => {
  it('matches ** across folders, * within one, and ? for one character', () => {
    expect(globToRegExp('**/*.md').test('README.md')).toBe(true);
    expect(globToRegExp('**/*.md').test('src/docs/a.md')).toBe(true);
    expect(globToRegExp('assets/*.css').test('assets/a.css')).toBe(true);
    expect(globToRegExp('assets/*.css').test('assets/x/a.css')).toBe(false);
    expect(globToRegExp('assets/raw/**').test('assets/raw/a/b.png')).toBe(true);
    expect(globToRegExp('a?.txt').test('ab.txt')).toBe(true);
    expect(globToRegExp('src/a.b').test('src/aXb')).toBe(false);
  });

  it('never copies secrets, tests, node_modules, git files or markdown; extra globs add to that', () => {
    const ex = makeExcluder(['assets/raw/**']);
    for (const rel of ['src/.env', 'src/.env.local', 'includes/x.key', 'src/cert.pem', 'src/auth.json', 'src/tests/A.php',
      'assets/node_modules/x.js', 'src/.gitignore', 'includes/phpunit.xml.dist', 'src/NOTES.md', 'assets/raw/big.psd']) {
      expect(ex(rel), rel).toBe(true);
    }
    for (const rel of ['src/Plugin.php', 'assets/receipt.css', 'templates/email.php']) expect(ex(rel), rel).toBe(false);
  });

  it('lists only src/, includes/, templates/ and assets/ (no stray files)', () => {
    const root = tmpdir();
    try {
      write(root, 'flat.php', '<?php');
      write(root, 'notes.txt', 'x');
      write(root, 'bin/build.sh', 'x');
      write(root, 'src/A.php', GUARD);
      write(root, 'src/tests/ATest.php', '<?php');
      write(root, 'assets/a.css', 'body{}');
      write(root, 'templates/mail.php', "<?php defined('ABSPATH') || exit; ?>");
      expect(listCompanionTree(root)).toEqual(['assets/a.css', 'src/A.php', 'templates/mail.php']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('Composer packages installed from a git clone', () => {
  it("removes .git and the package's export-ignore paths, like its release zip", () => {
    const root = tmpdir();
    try {
      const pkg = 'vendor/acme/pdf/';
      write(root, pkg + '.git/HEAD', 'ref');
      write(root, pkg + '.gitattributes', '/tests export-ignore\n/.github export-ignore\n*.pdf binary\n/../escape export-ignore\n');
      write(root, pkg + 'tests/big.pdf', 'x');
      write(root, pkg + '.github/ci.yml', 'x');
      write(root, pkg + 'src/Pdf.php', '<?php');
      write(root, 'vendor/acme/zip/tests/keep.php', '<?php'); // release zip install: untouched
      write(root, 'vendor/composer/installed.json', '{}');
      expect(stripSourceInstalls(path.join(root, 'vendor'))).toEqual(['acme/pdf']);
      expect(fs.existsSync(path.join(root, pkg, '.git'))).toBe(false);
      expect(fs.existsSync(path.join(root, pkg, 'tests'))).toBe(false);
      expect(fs.existsSync(path.join(root, pkg, '.github'))).toBe(false);
      expect(fs.existsSync(path.join(root, pkg, 'src/Pdf.php'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'vendor/acme/zip/tests/keep.php'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('source checks (§16.10 #1, #7)', () => {
  it('rejects declare/namespace in flat files and PHP without the ABSPATH guard; accepts the guard after namespace', () => {
    const root = tmpdir();
    try {
      write(root, 'ok.php', "<?php\nadd_action('init', 'x');\n");
      write(root, 'bad-flat.php', '<?php\ndeclare(strict_types=1);\n');
      write(root, 'bad-ns.php', '<?php\nnamespace Acme;\n');
      write(root, 'src/Good.php', GUARD + 'final class Good {}');
      write(root, 'src/Bad.php', '<?php\nnamespace Acme\\Shop;\nfinal class Bad {}');
      write(root, 'templates/page.html', '<p>not php</p>');
      write(root, 'assets/vendor-lib.php', '<?php // assets are not checked');
      const problems = checkCompanionSources(root, listCompanionTree(root));
      expect(problems).toHaveLength(3);
      expect(problems.join('\n')).toMatch(/bad-flat\.php.*declare\(strict_types=1\)/);
      expect(problems.join('\n')).toMatch(/bad-ns\.php/);
      expect(problems.join('\n')).toMatch(/src\/Bad\.php.*ABSPATH/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('generated PHP', () => {
  const config = {
    slug: 'acme-site',
    name: 'Acme Site',
    version: '1.1.0',
    textDomain: 'acme',
    companion: { autoload: { 'Acme\\Shop\\': 'src/' }, requiresPlugins: ['easy-digital-downloads', 'woocommerce'], requiresPhp: '8.1' },
  };

  it('writes Requires Plugins / Requires PHP headers and a deactivation hook', () => {
    const main = buildCompanionPluginMainFile(config);
    expect(main).toContain(' * Requires PHP: 8.1');
    expect(main).toContain(' * Requires Plugins: easy-digital-downloads, woocommerce');
    expect(main).toContain("do_action('forgewp_companion_deactivated')");
    // backend.php (with the flat files) loads before the hooks are registered (§16.10 #4)
    expect(main.indexOf("require_once __DIR__ . '/includes/backend.php'")).toBeLessThan(main.indexOf('register_activation_hook'));
    // outside the guard: also registered when the theme's copy already runs
    expect(main.slice(main.lastIndexOf('}\n\n// Registered'))).toContain('register_activation_hook');
  });

  it.skipIf(!hasPhp)('emits prelude, uninstall and loaders that lint cleanly', () => {
    const root = tmpdir();
    try {
      const files = {
        'prelude.php': '<?php\n' + buildCompanionPreludePhp(config, { hasVendor: true }),
        'uninstall.php': buildCompanionUninstallPhp(config),
        'loader-embed.php': '<?php\n' + buildThemeCompanionLoaderPhp(config),
        'loader-no-embed.php': '<?php\n' + buildThemeCompanionLoaderPhp({ ...config, companion: { embedInTheme: false } }),
      };
      for (const [name, php] of Object.entries(files)) {
        write(root, name, php);
        expect(lint(path.join(root, name)), name).toBe('');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it.skipIf(!hasPhp)('autoloads companion.autoload classes from <SLUG>_DIR, which ends with /', () => {
    const root = tmpdir();
    try {
      write(root, 'project/src/Billing/Invoice.php', GUARD.replace('Acme\\Shop', 'Acme\\Shop\\Billing') + 'final class Invoice { public static function n() { return 42; } }');
      write(root, 'run.php', `<?php
define('ABSPATH', __DIR__);
function add_action() {} function trailingslashit($s) { return rtrim($s, '/') . '/'; }
function get_template_directory_uri() { return 'https://site.test/wp-content/themes/acme-site'; }
define('FORGEWP_COMPANION_ACME_SITE', 'theme');
${buildCompanionPreludePhp(config, { hasVendor: false })}
echo json_encode(array(\\Acme\\Shop\\Billing\\Invoice::n(), substr(FORGEWP_COMPANION_ACME_SITE_DIR, -9), FORGEWP_COMPANION_ACME_SITE_URL));`);
      const r = spawnSync('php', [path.join(root, 'run.php')], { encoding: 'utf8' });
      expect(r.status, r.stdout + r.stderr).toBe(0);
      expect(JSON.parse(r.stdout)).toEqual([42, '/project/', 'https://site.test/wp-content/themes/acme-site/companion/project/']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it.skipIf(!hasPhp)('uninstall does nothing without opt-in, and never loads a second copy of the backend', () => {
    const root = tmpdir();
    try {
      write(root, 'includes/backend.php', "<?php $GLOBALS['loaded'] = ($GLOBALS['loaded'] ?? 0) + 1;");
      write(root, 'uninstall.php', buildCompanionUninstallPhp(config));
      const run = (pre) => {
        write(root, 'run.php', `<?php
$GLOBALS['fired'] = 0; $GLOBALS['deleted'] = array();
function do_action($a) { if ($a === 'forgewp_companion_uninstall') $GLOBALS['fired']++; }
function delete_option($k) { $GLOBALS['deleted'][] = $k; }
define('WP_UNINSTALL_PLUGIN', 'x');
${pre}
include __DIR__ . '/uninstall.php';
echo json_encode(array($GLOBALS['fired'], $GLOBALS['loaded'] ?? 0, count($GLOBALS['deleted'])));`);
        const r = spawnSync('php', [path.join(root, 'run.php')], { encoding: 'utf8' });
        expect(r.status, r.stdout + r.stderr).toBe(0);
        return JSON.parse(r.stdout);
      };
      expect(run('')).toEqual([0, 0, 0]);
      expect(run("define('FORGEWP_COMPANION_DELETE_DATA', true);")).toEqual([1, 1, 2]);
      expect(run("define('FORGEWP_COMPANION_DELETE_DATA', true); define('FORGEWP_COMPANION_ACME_SITE', 'theme');")).toEqual([1, 0, 2]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!hasComposer || !hasPhp)('export with a project tree and Composer (R9)', () => {
  async function exportProject(extraConfig = {}, mutate = () => {}) {
    const root = tmpdir();
    write(root, 'dist/assets/main.js', 'console.log(1);');
    write(root, 'dist/assets/app.css', 'body{}');
    write(root, 'package.json', '{"type":"module"}');
    write(root, 'wp.config.ts', `export default {configVersion:1,name:'Acme Site',slug:'acme-site',version:'1.0.0',description:'R9',textDomain:'acme'};`);
    const p = 'src/server/plugin/';
    write(root, p + 'boot.php', "<?php\nadd_action('init', function () { \\Acme\\Shop\\Plugin::boot(); });\n");
    write(root, p + 'src/Plugin.php', GUARD + 'final class Plugin { public static function boot(): void {} }');
    write(root, p + 'src/tests/PluginTest.php', '<?php // never shipped');
    write(root, p + 'assets/receipt.css', '.r{}');
    write(root, p + 'templates/mail.php', "<?php defined('ABSPATH') || exit; ?><p>Hi</p>");
    write(root, p + '.env', 'SECRET=1');
    write(root, p + 'composer.json', JSON.stringify({ name: 'acme/site', autoload: { 'psr-4': { 'Acme\\Shop\\': 'src/' } }, require: {} }));
    mutate(root);
    const lock = spawnSync('composer', ['update', '--no-interaction', '--no-progress', '--no-scripts'], { cwd: path.join(root, p), encoding: 'utf8' });
    expect(lock.status, lock.stdout + lock.stderr).toBe(0);
    fs.rmSync(path.join(root, p, 'vendor'), { recursive: true, force: true });
    const config = { ...(await loadConfig(root)), ...extraConfig };
    const outDir = path.join(root, 'out', 'acme-site');
    await generateTheme({ themeRoot: root, outDir, config, appHtml: '<main>R9</main>', assets: { cssFile: 'assets/app.css', jsFile: 'assets/main.js' } });
    return { root, outDir, pluginDir: path.join(root, 'out', 'acme-site-companion') };
  }

  it('copies the tree + vendor/ into both copies, leaves secrets and tests out, and never changes the project', async () => {
    const { root, outDir, pluginDir } = await exportProject();
    try {
      for (const base of [path.join(outDir, 'companion', 'project'), path.join(pluginDir, 'project')]) {
        for (const rel of ['src/Plugin.php', 'assets/receipt.css', 'templates/mail.php', 'vendor/autoload.php', 'vendor/composer/autoload_psr4.php', 'index.php']) {
          expect(fs.existsSync(path.join(base, rel)), `${base}/${rel}`).toBe(true);
        }
        for (const rel of ['src/tests/PluginTest.php', '.env', 'composer.json', 'boot.php']) {
          expect(fs.existsSync(path.join(base, rel)), `${base}/${rel}`).toBe(false);
        }
        // PSR-4 path resolves next to vendor/ without rewriting composer.json (§16.10 #2)
        expect(fs.readFileSync(path.join(base, 'vendor/composer/autoload_psr4.php'), 'utf8')).toMatch(/\$baseDir \. '\/src'/);
      }
      expect(fs.existsSync(path.join(root, 'src/server/plugin/vendor'))).toBe(false);
      expect(fs.existsSync(path.join(pluginDir, 'uninstall.php'))).toBe(true);
      const backend = fs.readFileSync(path.join(pluginDir, 'includes', 'backend.php'), 'utf8');
      const order = ["_DIR', dirname(__DIR__)", "vendor/autoload.php';", 'forgewp_companion_upgraded', 'Acme\\Shop\\Plugin::boot()'].map((s) => backend.indexOf(s));
      expect(order.every((i) => i > -1), JSON.stringify(order)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      for (const f of [path.join(pluginDir, 'includes', 'backend.php'), path.join(pluginDir, 'uninstall.php'), path.join(outDir, 'functions.php')]) {
        expect(lint(f), f).toBe('');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('embedInTheme: false leaves the backend out of the theme and asks for the plugin', async () => {
    const { root, outDir, pluginDir } = await exportProject({ companion: { embedInTheme: false } });
    try {
      expect(fs.existsSync(path.join(outDir, 'companion'))).toBe(false);
      expect(fs.existsSync(path.join(pluginDir, 'project', 'vendor', 'autoload.php'))).toBe(true);
      expect(fs.readFileSync(path.join(outDir, 'functions.php'), 'utf8')).toContain('needs its companion plugin');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('stops the export when composer.lock is missing', async () => {
    const root = tmpdir();
    try {
      write(root, 'dist/assets/main.js', '');
      write(root, 'dist/assets/app.css', '');
      write(root, 'package.json', '{"type":"module"}');
      write(root, 'wp.config.ts', `export default {configVersion:1,name:'X',slug:'x-site',version:'1.0.0',description:'x',textDomain:'x'};`);
      write(root, 'src/server/plugin/composer.json', '{"name":"x/x","require":{}}');
      const config = await loadConfig(root);
      await expect(
        generateTheme({ themeRoot: root, outDir: path.join(root, 'out', 'x-site'), config, appHtml: '<main></main>', assets: { cssFile: 'assets/app.css', jsFile: 'assets/main.js' } }),
      ).rejects.toThrow(/no composer\.lock/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
