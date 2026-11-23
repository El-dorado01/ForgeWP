/**
 * R7 (resource-contracts.md §15): money in integer minor units without float
 * drift, and the cross-origin guest cart token, which may only restore a
 * well-formed WooCommerce session cookie on ForgeWP routes and never replaces
 * a real cookie. Executes the generated PHP with small stand-ins.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildCommerceResourcesPhp } from '../../lib/functions/commerce-resources.js';
import { buildFunctionsPhpParts } from '../../lib/functions/index.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;

function run(prelude, script) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-commerce-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php
function add_filter(...$a) {} function add_action(...$a) {} function apply_filters($n, $v) { return $v; }
${prelude}
${buildCommerceResourcesPhp()}
${script}`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('commerce money', () => {
  const money = (decimals, values) =>
    run(`function wc_get_price_decimals() { return ${decimals}; }`, `echo json_encode(array_map('forgewp_commerce_money', json_decode(${JSON.stringify(JSON.stringify(values))}, true)));`);

  it.skipIf(!hasPhp)('converts to integer minor units without float drift', () => {
    expect(money(2, ['49.90', 0.1 + 0.2, '279.70', 1.005, '-5.5', '', null, '1234567.89'])).toEqual([4990, 30, 27970, 101, -550, 0, 0, 123456789]);
  });
  it.skipIf(!hasPhp)('handles zero- and three-decimal currencies (JPY, KWD)', () => {
    expect(money(0, ['1500', '1499.6'])).toEqual([1500, 1500]);
    expect(money(3, ['12.345', '0.001'])).toEqual([12345, 1]);
  });
});

describe('cross-origin guest cart token', () => {
  const apply = ({ token, uri = '/wp-json/forgewp/v1/cart', cookie }) =>
    run(
      `define('COOKIEHASH', 'abc');`,
      `$_SERVER['HTTP_X_FORGEWP_CART_TOKEN'] = ${JSON.stringify(token)}; $_SERVER['REQUEST_URI'] = ${JSON.stringify(uri)};
${cookie ? `$_COOKIE['wp_woocommerce_session_abc'] = ${JSON.stringify(cookie)};` : ''}
forgewp_commerce_apply_cart_token();
echo json_encode($_COOKIE['wp_woocommerce_session_abc'] ?? null);`,
    );
  const tok = (raw) => 'v1.' + Buffer.from(raw).toString('base64url');
  const valid = 't_8b1c2|1767225600|1767139200|0f9e8d7c6b5a';

  it.skipIf(!hasPhp)('restores the session cookie from a well-formed token on ForgeWP routes', () => {
    expect(apply({ token: tok(valid) })).toBe(valid);
  });
  it.skipIf(!hasPhp)('never replaces a real cookie', () => {
    expect(apply({ token: tok(valid), cookie: 'real|1|1|h' })).toBe('real|1|1|h');
  });
  it.skipIf(!hasPhp)('ignores other routes, other versions and malformed payloads', () => {
    expect(apply({ token: tok(valid), uri: '/wp-json/wc/store/v1/cart' })).toBeNull();
    expect(apply({ token: 'v2.' + Buffer.from(valid).toString('base64url') })).toBeNull();
    expect(apply({ token: tok('t_1|x|1|h') })).toBeNull();
    expect(apply({ token: tok('t_1|1|1|h|extra') })).toBeNull();
    expect(apply({ token: tok("t_1'; DROP|1|1|h") })).toBeNull();
    expect(apply({ token: 'v1.%%%' })).toBeNull();
  });
});

describe('commerce wiring', () => {
  it('ships in the backend (Companion Plugin + theme fallback), not in the theme part', () => {
    const parts = buildFunctionsPhpParts({ name: 'Shop', slug: 'shop', version: '1.0.0', textDomain: 'shop' }, { cssFile: 'assets/app.css' }, [], '', [], { primary: [] }, null, [], {}, [], []);
    expect(parts.backend).toContain('function forgewp_commerce_cart_resource');
    expect(parts.theme).not.toContain('function forgewp_commerce_cart_resource');
  });
  it('has no unescaped template-literal hazards in the PHP', () => {
    const php = buildCommerceResourcesPhp();
    expect(php).toContain("register_rest_route('forgewp/v1', '/cart/items'");
    expect(php).not.toMatch(/\\\\/);
  });
});
