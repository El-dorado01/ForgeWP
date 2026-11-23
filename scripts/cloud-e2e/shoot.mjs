#!/usr/bin/env node
// Headless screenshot + health probe for cloud E2E runs.
// usage: node scripts/cloud-e2e/shoot.mjs --base <url> --routes /,/about --out <dir> [--label native] [--login]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const base = arg('base', 'http://localhost:8080').replace(/\/$/, '');
const routes = arg('routes', '/').split(',');
const out = arg('out', '.forgewp/e2e-artifacts/shots');
const label = arg('label', 'site');
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const report = [];
for (const [vpName, viewport] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (flag('login')) {
    const p = await ctx.newPage();
    await p.goto(`${base}/wp-login.php`);
    await p.fill('#user_login', process.env.WP_USER || 'admin');
    await p.fill('#user_pass', process.env.WP_PASS || 'admin');
    await Promise.all([p.waitForNavigation(), p.click('#wp-submit')]);
    await p.close();
  }
  for (const route of routes) {
    const page = await ctx.newPage();
    const consoleErrors = [], failed = [], bad = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`));
    page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
    const res = await page.goto(base + route, { waitUntil: 'networkidle' }).catch((e) => ({ status: () => `ERR ${e.message}` }));
    await page.waitForTimeout(300);
    const html = await page.content();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null);
    const slug = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/[^\w-]+/g, '_');
    const file = path.join(out, `${label}-${slug}-${vpName}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.push({
      label, route, viewport: vpName, status: res?.status?.(), title: await page.title(), screenshot: file,
      horizontalOverflow: overflow,
      leaks: {
        nextRuntime: /\/_next\/static/.test(html),
        compileTokens: /__FORGEWP_|forgewp-shortcode|<\?php/.test(html),
      },
      consoleErrors, failedRequests: failed.filter((f) => !/gravatar|wordpress\.org|s\.w\.org/.test(f)), errorResponses: bad,
    });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, `${label}-report.json`), JSON.stringify(report, null, 2));
for (const r of report) {
  const issues = [r.horizontalOverflow && 'overflow', r.leaks.nextRuntime && '_next leak', r.leaks.compileTokens && 'token leak',
    r.consoleErrors.length && `${r.consoleErrors.length} console err`, r.failedRequests.length && `${r.failedRequests.length} failed req`,
    r.errorResponses.length && `${r.errorResponses.length} 4xx/5xx`].filter(Boolean);
  console.log(`${r.status} ${r.viewport.padEnd(7)} ${r.route.padEnd(20)} ${issues.join(', ') || 'ok'}`);
}
