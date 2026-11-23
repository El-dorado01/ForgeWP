/**
 * Parity CI (R6) finding: activation replaced a declared themeMods.footer_text
 * with a generic "© <year> <site>. All rights reserved.", so native and the
 * project's own fixtures disagreed. The declared value now wins.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildRoutingPhp } from '../../lib/functions/routing.js';

const hasPhp = (() => {
  try {
    execFileSync('php', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

function activationFooter(config, existing = '') {
  const php = buildRoutingPhp({ textDomain: 'test_theme', ...config }, '', '', '', '', []);
  const start = php.indexOf('function forgewp_set_default_footer_text');
  const end = php.indexOf("add_action('after_switch_theme', 'forgewp_set_default_footer_text');");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-footer-'));
  const file = path.join(dir, 'run.php');
  fs.writeFileSync(file, `<?php
$mods = array('footer_text' => ${JSON.stringify(existing)});
function get_theme_mod($k) { global $mods; return $mods[$k] ?? false; }
function set_theme_mod($k, $v) { global $mods; $mods[$k] = $v; }
function get_bloginfo($k) { return 'My Site'; }
function __($s, $d) { return $s; }
${php.slice(start, end)}
forgewp_set_default_footer_text();
echo $mods['footer_text'];
`);
  try {
    return execFileSync('php', [file], { encoding: 'utf8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('footer_text activation default', () => {
  it.skipIf(!hasPhp)('uses the declared themeMods value, quotes and all', () => {
    expect(activationFooter({ themeMods: { footer_text: "© 2026 Studio's <Shop>" } })).toBe("© 2026 Studio's <Shop>");
  });
  it.skipIf(!hasPhp)('falls back to the generic text without a declaration', () => {
    expect(activationFooter({})).toMatch(/^© \d{4} My Site\. All rights reserved\.$/);
  });
  it.skipIf(!hasPhp)('never overwrites a value the site already has', () => {
    expect(activationFooter({ themeMods: { footer_text: 'Declared' } }, 'Edited in Customizer')).toBe('Edited in Customizer');
  });
});
