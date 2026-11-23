/**
 * Phase B Companion Plugin. Verified live in the cloud sandbox in three
 * shapes: theme only (embedded backend), theme + plugin (plugin wins), and
 * plugin only under twentytwentyfive (all forgewp/v1 routes, forms submit,
 * site-settings and menus keep working).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildFunctionsPhpParts, buildFunctionsPhp } from '../../lib/functions/index.js';
import {
  buildCompanionPluginMainFile, buildThemeCompanionLoaderPhp, companionConstant, writeCompanionPlugin,
} from '../../lib/companion-plugin.js';

const config = {
  name: 'Demo Site', slug: 'demo-site', version: '1.2.3', textDomain: 'demo-site',
  forms: { contact: { mailTo: 'admin', subject: 'Hi', fields: { email: { type: 'email', label: 'Email', required: true } } } },
};
const parts = buildFunctionsPhpParts(config, { cssFile: 'assets/app.css' }, [], '', [], { primary: [] }, null, [], {}, [], []);

const lint = (code) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-companion-'));
  try {
    const f = path.join(dir, 'f.php');
    writeFileSync(f, code);
    return spawnSync('php', ['-l', f], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('backend / theme split', () => {
  it('puts data and REST contracts in the backend and rendering in the theme', () => {
    expect(parts.backend).toContain("function forgewp_register_decoupled_rest_bridge()");
    expect(parts.backend).toContain('function forgewp_handle_form_contact(');
    expect(parts.backend).toContain("function forgewp_site_settings_resource()");
    expect(parts.backend).toContain("function forgewp_theme_state_keys()");
    expect(parts.backend).not.toContain("add_action('enqueue_block_assets', 'forgewp_enqueue_assets')");
    expect(parts.theme).toContain("add_action('enqueue_block_assets', 'forgewp_enqueue_assets')");
    expect(parts.theme).toContain("function forgewp_auto_create_pages_and_menus()");
  });

  it('never makes the backend depend on theme-only functions or theme paths', () => {
    const defs = (s) => new Set([...s.matchAll(/function\s+([a-z_][a-z0-9_]*)\s*\(/gi)].map((m) => m[1]));
    const backendDefs = defs(parts.backend);
    const themeDefs = defs(parts.theme);
    const calls = [...parts.backend.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)].map((m) => m[1]);
    expect(calls.filter((c) => themeDefs.has(c) && !backendDefs.has(c))).toEqual([]);
    expect([...backendDefs].filter((f) => themeDefs.has(f))).toEqual([]);
    expect(parts.backend).not.toMatch(/FORGEWP_THEME_VERSION|get_template_directory|get_stylesheet_directory/);
  });

  it('keeps buildFunctionsPhp() as the combined single-file output', () => {
    const combined = buildFunctionsPhp(config, { cssFile: 'assets/app.css' }, [], '', [], { primary: [] }, null, [], {}, [], []);
    expect(combined.startsWith('<?php')).toBe(true);
    expect(combined).toContain('function forgewp_register_decoupled_rest_bridge()');
    expect(combined).toContain("add_action('enqueue_block_assets', 'forgewp_enqueue_assets')");
  });
});

describe('companion emitter', () => {
  it('writes the embedded theme copy and a standalone plugin that lint cleanly', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'forgewp-companion-out-'));
    try {
      const outDir = path.join(root, 'demo-site');
      const { pluginDir } = writeCompanionPlugin({ outDir, config, backendPhp: parts.backend });
      const embedded = path.join(outDir, 'companion', 'backend.php');
      const main = path.join(pluginDir, 'demo-site-companion.php');
      const included = path.join(pluginDir, 'includes', 'backend.php');
      for (const f of [embedded, main, included]) {
        expect(existsSync(f)).toBe(true);
        const r = spawnSync('php', ['-l', f], { encoding: 'utf8' });
        expect(r.status, r.stdout + r.stderr).toBe(0);
      }
      expect(readFileSync(embedded, 'utf8')).toBe(readFileSync(included, 'utf8'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lets an active plugin win and warns on a version mismatch', () => {
    const constant = companionConstant('demo-site');
    expect(constant).toBe('FORGEWP_COMPANION_DEMO_SITE');
    const loader = buildThemeCompanionLoaderPhp(config);
    expect(loader).toContain(`if (!defined('${constant}')) {`);
    expect(loader).toContain("require_once __DIR__ . '/companion/backend.php';");
    expect(loader).toContain(`${constant}_VERSION !== '1.2.3'`);
    expect(lint('<?php\n' + loader).status).toBe(0);
    const main = buildCompanionPluginMainFile(config);
    expect(main).toContain(' * Plugin Name: Demo Site Companion');
    expect(main).toContain(`define('${constant}', 'plugin');`);
    expect(main).toContain('register_activation_hook(__FILE__');
  });
});
