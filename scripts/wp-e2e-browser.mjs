#!/usr/bin/env node
/**
 * IDE-agnostic local Chrome (CDP) runner for ForgeWP WordPress E2E acceptance testing.
 * Works identically in VS Code, Antigravity, or any terminal using `.env.localwp`.
 *
 * Subcommands:
 *   node scripts/wp-e2e-browser.mjs check-access [--headed | --headless] [--slowmo <ms>] [--keep-open <ms>]
 *   node scripts/wp-e2e-browser.mjs compare --native <url> --decoupled <url> [--routes /,/about] [--headed | --headless] [--slowmo <ms>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from '../packages/compiler/test/browser/chrome.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(repoRoot, '.forgewp', 'e2e-artifacts');

function loadEnvLocalWp() {
  const envPath = path.join(repoRoot, '.env.localwp');
  const parsed = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
  }
  return {
    url: process.env.FORGEWP_LOCALWP_URL || parsed.FORGEWP_LOCALWP_URL || '',
    adminUrl:
      process.env.FORGEWP_LOCALWP_ADMIN_URL ||
      parsed.FORGEWP_LOCALWP_ADMIN_URL ||
      '',
    username:
      process.env.FORGEWP_LOCALWP_USERNAME ||
      parsed.FORGEWP_LOCALWP_USERNAME ||
      '',
    password:
      process.env.FORGEWP_LOCALWP_PASSWORD ||
      parsed.FORGEWP_LOCALWP_PASSWORD ||
      '',
    sitePath:
      process.env.FORGEWP_LOCALWP_SITE_PATH ||
      parsed.FORGEWP_LOCALWP_SITE_PATH ||
      '',
    themesPath:
      process.env.FORGEWP_LOCALWP_THEMES_PATH ||
      parsed.FORGEWP_LOCALWP_THEMES_PATH ||
      '',
  };
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command: positional[0] || 'check-access', flags };
}

function summarizeEvents(events) {
  const consoleErrors = [];
  const failedRequests = [];
  const errorResponses = [];
  for (const event of events) {
    if (event.method === 'Runtime.exceptionThrown') {
      const desc =
        event.params?.exceptionDetails?.exception?.description ||
        event.params?.exceptionDetails?.text ||
        'Uncaught runtime exception';
      consoleErrors.push(desc);
    } else if (
      event.method === 'Runtime.consoleAPICalled' &&
      event.params?.type === 'error'
    ) {
      const msg = (event.params.args || [])
        .map((a) => a.value ?? a.description ?? '')
        .filter(Boolean)
        .join(' ');
      if (msg) consoleErrors.push(msg);
    } else if (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error') {
      if (event.params.entry.text) {
        consoleErrors.push(event.params.entry.text);
      }
    } else if (event.method === 'Network.loadingFailed') {
      if (event.params?.canceled) continue;
      failedRequests.push({
        type: event.params?.type || '',
        errorText: event.params?.errorText || 'Failed',
      });
    } else if (event.method === 'Network.responseReceived') {
      const status = Number(event.params?.response?.status || 0);
      const url = String(event.params?.response?.url || '');
      if (status >= 400 && !url.endsWith('/favicon.ico')) {
        errorResponses.push({ status, url });
      }
    }
  }
  return { consoleErrors, failedRequests, errorResponses };
}

async function runCheckAccess(flags) {
  const cfg = loadEnvLocalWp();
  if (!cfg.url) {
    throw new Error('Missing FORGEWP_LOCALWP_URL in .env.localwp or environment.');
  }
  const adminUrl = cfg.adminUrl || `${cfg.url.replace(/\/+$/, '')}/wp-admin`;
  if (!cfg.username || !cfg.password) {
    throw new Error(
      'Missing FORGEWP_LOCALWP_USERNAME or FORGEWP_LOCALWP_PASSWORD in .env.localwp or environment.',
    );
  }

  const headed = flags.headless ? false : true;
  const slowMo = flags.slowmo !== undefined ? Number(flags.slowmo) : headed ? 400 : 0;
  const keepOpen = flags['keep-open'] !== undefined ? Number(flags['keep-open']) : headed ? 2500 : 0;

  let themesOnDisk = [];
  if (cfg.themesPath && fs.existsSync(cfg.themesPath)) {
    themesOnDisk = fs
      .readdirSync(cfg.themesPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  }

  let chrome;
  try {
    chrome = await openChrome({ headed, slowMo, viewport: { width: 1440, height: 900 } });

    // 1. Check live LocalWP frontend (read-only)
    chrome.clearEvents();
    await chrome.goto(cfg.url);
    const frontendInfo = await chrome.evaluate(`(() => ({
      url: location.href,
      title: document.title,
      bodyClass: document.body ? document.body.className : '',
      h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '',
    }))()`);
    const frontendDiagnostics = summarizeEvents(chrome.events);
    const frontendShot = path.join(artifactsDir, 'access-frontend.png');
    await chrome.screenshot(frontendShot);

    // 2. Authenticate to wp-admin (read-only Dashboard verification)
    chrome.clearEvents();
    await chrome.goto(adminUrl);
    const isLoginScreen = await chrome.evaluate(
      `Boolean(document.querySelector('#user_login') && document.querySelector('#user_pass'))`,
    );

    if (isLoginScreen) {
      await chrome.fill('#user_login', cfg.username);
      await chrome.fill('#user_pass', cfg.password);
      await chrome.click('#wp-submit');
      await chrome.wait(async () => {
        try {
          return await chrome.evaluate(`(() => {
            if (document.querySelector('#login_error')) {
              return { status: 'login_error', message: document.querySelector('#login_error').textContent.trim() };
            }
            if (document.querySelector('#wpadminbar') && location.pathname.includes('/wp-admin')) {
              return { status: 'ok' };
            }
            return null;
          })()`);
        } catch {
          return null;
        }
      }, 'wp-admin login completion', 20000);

      const loginCheck = await chrome.evaluate(`(() => {
        const errEl = document.querySelector('#login_error');
        if (errEl) return { ok: false, error: errEl.textContent.trim() };
        return { ok: Boolean(document.querySelector('#wpadminbar')) };
      })()`);
      if (!loginCheck.ok) {
        throw new Error(`wp-admin login failed: ${loginCheck.error || 'Unknown error'}`);
      }
    }

    const adminInfo = await chrome.evaluate(`(() => ({
      url: location.href,
      title: document.title,
      heading: document.querySelector('#wpbody-content h1') ? document.querySelector('#wpbody-content h1').textContent.trim() : '',
      wpVersion: document.querySelector('#footer-upgrade') ? document.querySelector('#footer-upgrade').textContent.trim() : '',
      themesLinkVisible: Boolean(document.querySelector('a[href*="themes.php"]')),
    }))()`);
    const adminDiagnostics = summarizeEvents(chrome.events);
    const adminShot = path.join(artifactsDir, 'access-wp-admin.png');
    await chrome.screenshot(adminShot);

    if (keepOpen > 0) {
      await new Promise((resolve) => setTimeout(resolve, keepOpen));
    }

    const result = {
      ok: true,
      mode: headed ? 'headed' : 'headless',
      checkedAt: new Date().toISOString(),
      wpUrl: cfg.url,
      adminUrl,
      themesPathExists: Boolean(cfg.themesPath && fs.existsSync(cfg.themesPath)),
      themesOnDisk,
      frontend: { ...frontendInfo, screenshot: path.relative(repoRoot, frontendShot), ...frontendDiagnostics },
      wpAdmin: { ...adminInfo, screenshot: path.relative(repoRoot, adminShot), ...adminDiagnostics },
    };

    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.writeFileSync(
      path.join(artifactsDir, 'access-result.json'),
      JSON.stringify(result, null, 2),
      'utf8',
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await chrome?.close();
  }
}

async function runCompare(flags) {
  const nativeBase = String(flags.native || '').replace(/\/+$/, '');
  const decoupledBase = String(flags.decoupled || '').replace(/\/+$/, '');
  if (!nativeBase || !decoupledBase) {
    throw new Error('Usage: compare --native <url> --decoupled <url> [--routes /,/about]');
  }
  const routes = String(flags.routes || '/')
    .split(',')
    .map((r) => (r.trim().startsWith('/') ? r.trim() : `/${r.trim()}`))
    .filter(Boolean);
  const headed = flags.headless ? false : true;
  const slowMo = flags.slowmo !== undefined ? Number(flags.slowmo) : headed ? 250 : 0;

  const compareDir = path.join(artifactsDir, 'compare');
  fs.mkdirSync(compareDir, { recursive: true });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true },
  ];

  let chrome;
  const results = [];
  try {
    chrome = await openChrome({ headed, slowMo, viewport: { width: 1440, height: 900 } });
    for (const route of routes) {
      const safeRoute = route === '/' ? 'home' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9_-]+/gi, '_');
      for (const [label, baseUrl] of [
        ['native', nativeBase],
        ['decoupled', decoupledBase],
      ]) {
        const targetUrl = `${baseUrl}${route === '/' ? '/' : route}`;
        for (const vp of viewports) {
          await chrome.setViewport(vp.width, vp.height, { mobile: vp.mobile });
          chrome.clearEvents();
          await chrome.goto(targetUrl);
          const pageInfo = await chrome.evaluate(`(() => ({
            url: location.href,
            title: document.title,
            h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '',
            htmlClass: document.documentElement.className,
            bodyClass: document.body ? document.body.className : '',
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }))()`);
          const diagnostics = summarizeEvents(chrome.events);
          const shotPath = path.join(compareDir, `${safeRoute}-${label}-${vp.name}.png`);
          await chrome.screenshot(shotPath);
          results.push({
            route,
            target: label,
            viewport: vp.name,
            screenshot: path.relative(repoRoot, shotPath),
            horizontalOverflow: pageInfo.scrollWidth > pageInfo.innerWidth,
            ...pageInfo,
            ...diagnostics,
          });
        }
      }
    }

    const report = {
      checkedAt: new Date().toISOString(),
      nativeBase,
      decoupledBase,
      routes,
      results,
    };
    fs.writeFileSync(
      path.join(artifactsDir, 'compare-result.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await chrome?.close();
  }
}

const { command, flags } = parseArgs(process.argv.slice(2));
if (command === 'check-access') {
  await runCheckAccess(flags);
} else if (command === 'compare') {
  await runCompare(flags);
} else {
  console.error(`Unknown subcommand "${command}". Use "check-access" or "compare".`);
  process.exit(1);
}
