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
import {
  compareResourceJson,
  normalizeComparableUrlPath,
  normalizeParityText,
} from '../../packages/compiler/lib/next-parity-helpers.js';

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
    case 'posts': return route.posts ? `/posts?${q({ type: route.posts.type, page: 1, perPage: 10, lang, taxonomy: route.posts.taxonomy, term: route.posts.term })}` : null;
    case 'term': return route.term ? `/terms/${route.term.taxonomy}/${route.term.slug}?${q({ lang })}` : null;
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
  for (const route of ROUTES) {
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
      const cmp = compareResourceJson(value, body);
      const show = (v) => (v === undefined ? 'undefined' : JSON.stringify(v)?.slice(0, 160));
      for (const d of cmp.diffs) {
        fail('resources', route.path, `resources.${name} != GET ${rest}`, `${d.path}: ${show(d.native)} != ${show(d.rest)}`);
      }
      if (cmp.ok) pass('resources', route.path, name);
    }
  }
}

/** Text of every [data-parity] element plus the primary menu, normalized. */
async function domSnapshot(page, url) {
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  const raw = await page.evaluate((status) => {
    // Primary language subtag only: native <html lang> comes from WordPress (en-US),
    // decoupled from the layout (en). Full-tag parity is tracked as gap P1 in
    // docs/phase-status-and-blog-urls.md; the locale check covers the language itself.
    const out = { status, lang: (document.documentElement.lang || '').toLowerCase().split('-')[0], parity: {}, menu: [] };
    for (const el of document.querySelectorAll('[data-parity]')) {
      const key = el.getAttribute('data-parity');
      (out.parity[key] ||= []).push(el.textContent || '');
    }
    for (const a of document.querySelectorAll('.fwp-nav a')) {
      out.menu.push([a.textContent || '', a.getAttribute('href') || '']);
    }
    return out;
  }, res?.status() ?? 0);
  const origins = [WP, NEXT];
  const parity = {};
  for (const [k, vals] of Object.entries(raw.parity)) {
    parity[k] = vals.map((v) => normalizeParityText(v));
  }
  const menu = raw.menu.map(([label, href]) => [
    normalizeParityText(label),
    normalizeComparableUrlPath(href, origins),
  ]);
  return { status: raw.status, lang: raw.lang, parity, menu };
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

async function checkLeaks(page) {
  for (const route of ROUTES) {
    for (const [mode, base] of [['native', WP], ['decoupled', NEXT]]) {
      await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
      const html = await page.content();
      const hits = [];
      const tokenMatches = html.match(/__FORGEWP_[A-Z0-9_]+__|<forgewp-[a-z-]+/gi);
      if (tokenMatches) hits.push(...Array.from(new Set(tokenMatches)));
      if (/<\?php/i.test(html)) hits.push('<?php');
      if (mode === 'native' && /\/_next\/static/.test(html)) hits.push('/_next/static');
      if (hits.length > 0) {
        fail('leaks', route.path, `${mode} HTML leaked compile/runtime artifact(s)`, hits.join(', '));
      } else {
        pass('leaks', route.path, mode);
      }
    }
  }
}

const checks = { resources: checkResources, dom: checkDom, leaks: checkLeaks, form: checkForm, auth: checkAuth, locale: checkLocale };
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
