#!/usr/bin/env node
/**
 * ForgeWP Phase D parity check (R6).
 *
 * The same project (projects/parity-fixture) runs twice against one WordPress:
 *   native     — exported theme active in WordPress (PARITY_WP_URL)
 *   decoupled  — `next build && next start` with FORGEWP_DEPLOYMENT_MODE=decoupled (PARITY_NEXT_URL)
 *
 * Checks (each failure is listed; exit code 1 if any):
 *   resources  native `forgeWpHydration.resources.*` deep-equals the matching REST body
 *   dom        `[data-parity]` text and primary-menu links match between native and decoupled
 *   form       the contact form submits successfully in both modes with the same status text
 *   auth       a logged-out visit to guarded routes ends on the same path in both modes
 *   locale     `<html lang>` and the i18n resource agree
 *
 * Usage: node scripts/parity/run-parity.mjs [--only resources,dom,...] [--report out.json]
 * Env:   PARITY_WP_URL (default http://localhost:8080), PARITY_NEXT_URL (default http://localhost:3100)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

// Playwright is a devDependency of the fixture (pinned to the CI browser build).
const require = createRequire(new URL('../../projects/parity-fixture/package.json', import.meta.url));
const { chromium } = require('playwright');

const WP = (process.env.PARITY_WP_URL || 'http://localhost:8080').replace(/\/$/, '');
const NEXT = (process.env.PARITY_NEXT_URL || 'http://localhost:3100').replace(/\/$/, '');
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = argValue('--only')?.split(',');
const reportPath = argValue('--report');

/** Routes both modes serve. `dom: false` skips DOM comparison (resources only). */
export const ROUTES = [
  { path: '/', post: { type: 'page', slug: 'home' } },
  { path: '/about/', post: { type: 'page', slug: 'about' } },
  { path: '/contact/', post: { type: 'page', slug: 'contact' } },
  { path: '/listing/', post: { type: 'page', slug: 'listing' } },
  { path: '/blog/', posts: { type: 'post' } },
  { path: '/blog/first-parity-post/', post: { type: 'post', slug: 'first-parity-post' } },
  { path: '/blog/second-parity-post/', post: { type: 'post', slug: 'second-parity-post' } },
  { path: '/blog/category/uncategorized/', dom: false, posts: { type: 'post', taxonomy: 'category', term: 'uncategorized' }, term: { taxonomy: 'category', slug: 'uncategorized' } },
];
export const GUARDED_ROUTES = ['/dashboard/', '/admin-area/'];

/**
 * WooCommerce routes (R7): native resources vs REST only (the fixture has no
 * decoupled shop pages). Used when /commerce/settings answers 200, i.e. when
 * WooCommerce is active (PARITY_WOOCOMMERCE=1 in scripts/parity/run.sh).
 */
export const COMMERCE_ROUTES = [
  // WooCommerce archives carry products (not posts: WooCommerce swaps in a stand-in page there).
  { path: '/shop/', dom: false, products: {}, post: { type: 'page', slug: 'shop' } },
  { path: '/product-category/clothing/', dom: false, products: { category: 'clothing' }, term: { taxonomy: 'product_cat', slug: 'clothing' } },
  { path: '/product/canvas-jacket/', dom: false, product: 'canvas-jacket', post: { type: 'product', slug: 'canvas-jacket' } },
  { path: '/product/wool-scarf/', dom: false, product: 'wool-scarf', post: { type: 'product', slug: 'wool-scarf' } },
];

const failures = [];
const passes = [];
const known = [];
/**
 * Known gaps (scripts/parity/known-gaps.json): differences we have already
 * triaged, each with an id and owner. They are reported but do not fail the
 * run. A gap that no longer reproduces DOES fail the run, so the list shrinks
 * as fixes land instead of hiding regressions.
 */
const knownGaps = JSON.parse(fs.readFileSync(new URL('./known-gaps.json', import.meta.url), 'utf8')).gaps;
const gapHits = new Map(knownGaps.map((g) => [g.id, 0]));
function matchGap(check, route, text) {
  return knownGaps.find((g) =>
    g.check === check &&
    (!g.routes || g.routes.includes(route)) &&
    new RegExp(g.match).test(text));
}
const fail = (check, route, message, detail) => {
  const text = `${message} ${typeof detail === 'string' ? detail : JSON.stringify(detail ?? '')}`;
  const gap = matchGap(check, route, text);
  if (gap) {
    gapHits.set(gap.id, gapHits.get(gap.id) + 1);
    known.push({ gap: gap.id, check, route, message, ...(detail ? { detail } : {}) });
    return;
  }
  failures.push({ check, route, message, ...(detail ? { detail } : {}) });
};
const pass = (check, route, message) => passes.push({ check, route, message });

/** REST URL for a native resource on a given route (resource-contracts.md). */
export function restUrlFor(name, route, lang = 'en') {
  const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')).toString();
  switch (name) {
    case 'site-settings': return `/site-settings`;
    case 'auth-me': return `/auth/me`;
    case 'menus': return `/menus?${q({ lang })}`;
    case 'routes': return `/routes?${q({ lang })}`;
    case 'i18n': return `/i18n?${q({ lang, path: route.path })}`;
    case 'forms': return `/forms?${q({ lang })}`;
    case 'post': return route.post ? `/posts/${route.post.type}/${route.post.slug}?${q({ lang })}` : null;
    case 'posts': return route.posts && !route.products ? `/posts?${q({ type: route.posts.type, page: 1, perPage: 10, lang, taxonomy: route.posts.taxonomy, term: route.posts.term })}` : null;
    case 'term': return route.term ? `/terms/${route.term.taxonomy}/${route.term.slug}?${q({ lang })}` : null;
    case 'commerce-settings': return '/commerce/settings';
    case 'products': return route.products ? `/products?${q({ contract: 2, category: route.products.category })}` : null;
    case 'product': return route.product ? `/products/${route.product}` : null;
    default: return undefined;
  }
}

/** Every differing leaf as "<json path>: <a> != <b>" (empty when deep-equal). */
export function differences(a, b, at = '$') {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => differences(a[k], b[k], Array.isArray(a) ? `${at}[${k}]` : `${at}.${k}`));
  }
  const show = (v) => (v === undefined ? 'undefined' : JSON.stringify(v)?.slice(0, 160));
  return [`${at}: ${show(a)} != ${show(b)}`];
}
export const firstDifference = (a, b) => differences(a, b)[0] ?? null;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 300) };
  }
}

async function checkResources(page) {
  const commerce = (await getJson(`${WP}/wp-json/forgewp/v1/commerce/settings`)).status === 200;
  if (commerce) console.log('  WooCommerce active: also checking', COMMERCE_ROUTES.map((r) => r.path).join(', '));
  for (const route of commerce ? [...ROUTES, ...COMMERCE_ROUTES] : ROUTES) {
    await page.goto(WP + route.path, { waitUntil: 'domcontentloaded' });
    const resources = await page.evaluate(() => window.forgeWpHydration?.resources ?? null);
    if (!resources) {
      fail('resources', route.path, 'window.forgeWpHydration.resources is missing');
      continue;
    }
    for (const [name, value] of Object.entries(resources)) {
      const rest = restUrlFor(name, route);
      if (rest === undefined) {
        fail('resources', route.path, `no REST mapping for resource "${name}" (add it to restUrlFor)`);
        continue;
      }
      if (rest === null) {
        if (value !== null) fail('resources', route.path, `resources.${name} should be null on this route`, JSON.stringify(value).slice(0, 200));
        continue;
      }
      const { status, body } = await getJson(`${WP}/wp-json/forgewp/v1${rest}`);
      if (status !== 200) {
        fail('resources', route.path, `GET ${rest} returned ${status}`, body);
        continue;
      }
      const diffs = differences(value, body);
      for (const diff of diffs) fail('resources', route.path, `resources.${name} != GET ${rest}`, diff);
      if (!diffs.length) pass('resources', route.path, name);
    }
  }
}

/** Text of every [data-parity] element plus the primary menu, normalized. */
async function domSnapshot(page, url) {
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  return page.evaluate((status) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    // Primary language subtag only: native <html lang> comes from WordPress (en-US),
    // decoupled from the layout (en). Full-tag parity is tracked as gap P1 in
    // docs/phase-status-and-blog-urls.md; the locale check covers the language itself.
    const out = { status, lang: (document.documentElement.lang || '').toLowerCase().split('-')[0], parity: {}, menu: [] };
    for (const el of document.querySelectorAll('[data-parity]')) {
      const key = el.getAttribute('data-parity');
      (out.parity[key] ||= []).push(norm(el.textContent));
    }
    for (const a of document.querySelectorAll('.fwp-nav a')) {
      let p = a.getAttribute('href') || '';
      try { p = new URL(p, location.href).pathname; } catch {}
      out.menu.push([norm(a.textContent), p.replace(/\/?$/, '/')]);
    }
    return out;
  }, res?.status() ?? 0);
}

async function checkDom(page) {
  for (const route of ROUTES.filter((r) => r.dom !== false)) {
    const native = await domSnapshot(page, WP + route.path);
    const decoupled = await domSnapshot(page, NEXT + route.path);
    if (Object.keys(native.parity).length === 0) fail('dom', route.path, 'native page has no [data-parity] elements');
    const diffs = differences(native, decoupled);
    const before = failures.length;
    for (const diff of diffs) fail('dom', route.path, 'native and decoupled DOM differ', diff);
    if (failures.length === before) pass('dom', route.path, `${Object.keys(native.parity).length} markers + ${native.menu.length} menu links`);
  }
}

async function submitContact(page, base) {
  await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
  const form = page.locator('form.fwp-form');
  await form.scrollIntoViewIfNeeded();
  // Native forms enforce a minimum fill time (time trap); wait it out like a person would.
  await page.waitForTimeout(3500);
  await form.locator('input[name="name"]').fill('Parity Bot');
  await form.locator('input[name="email"]').fill('parity@example.test');
  await form.locator('textarea[name="message"]').fill(`Parity submission via ${base}`);
  await form.locator('button[type="submit"]').click();
  const status = page.locator('[data-parity="form-status"]');
  await status.waitFor({ timeout: 15000 });
  return { state: await status.getAttribute('data-status'), text: (await status.textContent())?.trim() };
}

async function checkForm(browser) {
  const results = {};
  for (const [mode, base] of [['native', WP], ['decoupled', NEXT]]) {
    const page = await browser.newPage();
    try {
      results[mode] = await submitContact(page, base);
    } catch (error) {
      results[mode] = { state: 'error', text: String(error.message || error).split('\n')[0] };
    } finally {
      await page.close();
    }
  }
  for (const mode of ['native', 'decoupled']) {
    if (results[mode].state !== 'success') fail('form', '/contact/', `${mode} submit did not succeed`, results[mode]);
  }
  const diff = firstDifference(results.native, results.decoupled);
  if (diff) fail('form', '/contact/', 'submit result differs', diff);
  else if (results.native.state === 'success') pass('form', '/contact/', results.native.text);
}

/**
 * First redirect away from a guarded route, logged out. Trailing-slash
 * normalisation hops (Next.js 308 /x/ -> /x) are followed; the first hop to a
 * different path is the guard's decision. (WordPress core then sends /login on
 * to wp-login.php when no /login page exists; that second hop is not ForgeWP's.)
 */
async function guardRedirect(base, route) {
  let url = base + route;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location');
    const norm = (p) => p.replace(/\/?$/, '/');
    if (!location || res.status < 300 || res.status >= 400) {
      const html = await res.text();
      return { status: res.status, path: norm(new URL(url).pathname), leaked: /data-parity="title"[^>]*>[^<]*only/i.test(html) };
    }
    const next = new URL(location, url);
    if (norm(next.pathname) !== norm(route)) return { status: res.status, path: norm(next.pathname), leaked: false };
    url = next.href;
  }
  return { status: 0, path: 'redirect loop', leaked: false };
}

async function checkAuth() {
  for (const route of GUARDED_ROUTES) {
    const ends = { native: await guardRedirect(WP, route), decoupled: await guardRedirect(NEXT, route) };
    for (const mode of ['native', 'decoupled']) {
      if (ends[mode].leaked) fail('auth', route, `${mode}: guarded content leaked to a logged-out visitor`, ends[mode]);
      else if (ends[mode].path === route) fail('auth', route, `${mode}: logged-out visitor was not redirected`, ends[mode]);
    }
    const diff = firstDifference(ends.native.path, ends.decoupled.path);
    if (diff) fail('auth', route, 'logged-out redirect target differs', diff);
    else if (ends.native.path !== route) pass('auth', route, `both redirect to ${ends.native.path}`);
  }
}

async function checkLocale(page) {
  const { body: i18n } = await getJson(`${WP}/wp-json/forgewp/v1/i18n?lang=en&path=/`);
  for (const base of [WP, NEXT]) {
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    const lang = await page.evaluate(() => document.documentElement.lang);
    const expected = i18n?.currentLanguage;
    if (!lang || !expected || !lang.toLowerCase().startsWith(String(expected).toLowerCase())) {
      fail('locale', base === WP ? 'native /' : 'decoupled /', `<html lang="${lang}"> does not match i18n.currentLanguage "${expected}"`);
    } else pass('locale', base === WP ? 'native /' : 'decoupled /', lang);
  }
}

/**
 * R7 commerce flow over REST, as a cross-origin guest (no cookies, cart token
 * only). Runs only when WooCommerce is active. Expects the store that
 * run.sh sets up with PARITY_WOOCOMMERCE=1 (Linen Shirt: 3 in stock, Canvas
 * Jacket: variable S/M, flat rate + free shipping in DE, coupon save10, BACS).
 */
async function checkCommerce() {
  const settings = await getJson(`${WP}/wp-json/forgewp/v1/commerce/settings`);
  if (settings.status !== 200) {
    console.log('  WooCommerce not active: skipped');
    return;
  }
  let token = '';
  const call = async (method, route, body) => {
    const headers = { 'Content-Type': 'application/json', Origin: NEXT };
    if (token) headers['X-ForgeWP-Cart-Token'] = token;
    const res = await fetch(`${WP}/wp-json/forgewp/v1${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const next = res.headers.get('x-forgewp-cart-token');
    if (next) token = next;
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  const expect = (name, ok, detail) => (ok ? pass('commerce', name, 'ok') : fail('commerce', name, 'unexpected result', detail));
  const shirt = (await call('GET', '/products/linen-shirt')).body;
  const jacket = (await call('GET', '/products/canvas-jacket')).body;
  if (!shirt?.id || !jacket?.variations?.length) {
    fail('commerce', 'fixture', 'store fixture missing (linen-shirt, canvas-jacket)');
    return;
  }
  const added = await call('POST', '/cart/items', { productId: shirt.id, quantity: 2 });
  expect('add item', added.status === 200 && added.body.itemCount === 2 && Number.isInteger(added.body.totals.total) && token.startsWith('v1.'), { status: added.status, token: !!token });
  expect('cart is private', added.headers.get('cache-control') === 'private, no-store', added.headers.get('cache-control'));
  const variation = jacket.variations[0];
  const v = await call('POST', '/cart/items', { productId: jacket.id, variationId: variation.id });
  expect('add variation', v.status === 200 && v.body.itemCount === 3, v.body);
  expect('variable needs options', (await call('POST', '/cart/items', { productId: jacket.id })).status === 400);
  expect('stock limit', (await call('POST', '/cart/items', { productId: shirt.id, quantity: 9 })).status === 409);
  const coupon = await call('POST', '/cart/coupons', { code: 'save10' });
  expect('coupon', coupon.status === 200 && coupon.body.totals.discount > 0, coupon.body?.totals);
  const saved = token;
  token = '';
  const fresh = await call('GET', '/cart?contract=2');
  expect('no token: new empty cart', fresh.status === 200 && fresh.body.itemCount === 0, fresh.body?.itemCount);
  token = saved;
  const back = await call('GET', '/cart?contract=2');
  expect('token: same cart', back.status === 200 && back.body.itemCount === 3, back.body?.itemCount);
  token = 'v1.' + Buffer.from('1|9999999999|9999999999|forged').toString('base64url');
  const forged = await call('GET', '/cart?contract=2');
  expect('forged token selects no user cart', forged.status === 200 && forged.body.itemCount === 0, forged.body?.itemCount);
  token = saved;
  const badGateway = await call('POST', '/checkout', { billingAddress: { email: 'parity@example.test', country: 'DE' }, paymentMethod: 'stripe' });
  expect('unknown gateway rejected', badGateway.status === 400 && badGateway.body?.code === 'invalid_payment_method', badGateway.body);
  const order = await call('POST', '/checkout', {
    billingAddress: { firstName: 'Parity', lastName: 'Bot', address1: '1 Main', city: 'Berlin', postcode: '10115', country: 'DE', email: 'parity@example.test' },
    paymentMethod: 'bacs',
  });
  expect('checkout (bank transfer → on-hold)', order.status === 200 && order.body.status === 'on-hold' && order.body.needsRedirect === false && Number.isInteger(order.body.total), order.body);
  const after = await call('GET', '/cart?contract=2');
  expect('cart emptied after order', after.body?.itemCount === 0, after.body?.itemCount);
}

const checks = { resources: checkResources, dom: checkDom, form: checkForm, auth: checkAuth, locale: checkLocale, commerce: checkCommerce };
const needsBrowser = { form: true, auth: true };

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const [name, run] of Object.entries(checks)) {
    if (only && !only.includes(name)) continue;
    console.log(`\n▸ ${name}`);
    const before = failures.length;
    if (needsBrowser[name]) await run(browser);
    else {
      const page = await browser.newPage();
      try { await run(page); } finally { await page.close(); }
    }
    const added = failures.slice(before);
    for (const f of added) console.log(`  ✗ ${f.route} — ${f.message}${f.detail ? `\n      ${typeof f.detail === 'string' ? f.detail : JSON.stringify(f.detail)}` : ''}`);
    console.log(`  ${passes.filter((p) => p.check === name).length} passed, ${added.length} failed`);
  }
} finally {
  await browser.close();
}

if (!only) {
  for (const [id, hits] of gapHits) {
    if (hits === 0) failures.push({ check: 'known-gaps', route: '-', message: `known gap ${id} no longer reproduces: remove it from scripts/parity/known-gaps.json` });
  }
}
if (known.length) {
  console.log(`\nKnown gaps (${known.length} differences, not failing):`);
  for (const [id, hits] of gapHits) if (hits) console.log(`  ${id}: ${hits} — ${knownGaps.find((g) => g.id === id).title}`);
}
for (const f of failures.filter((f) => f.check === 'known-gaps')) console.log(`  ✗ ${f.message}`);

if (reportPath) {
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ wp: WP, next: NEXT, failures, known, passes }, null, 2));
}
console.log(`\nParity: ${passes.length} passed, ${failures.length} failed, ${known.length} known-gap differences`);
process.exit(failures.length ? 1 : 0);
