import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Find an available TCP port on the given host.
 * @param {string} [host='127.0.0.1']
 * @returns {Promise<number>}
 */
export function getFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, host, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

/**
 * Locate `node_modules/next/dist/bin/next` from `projectDir` or any ancestor directory.
 * @param {string} projectDir
 * @returns {string}
 */
export function resolveNextCliBin(projectDir) {
  let dir = path.resolve(projectDir || process.cwd());
  while (true) {
    const candidate = path.join(dir, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `FORGEWP_NEXT_CLI_NOT_FOUND: Could not find next/dist/bin/next from "${projectDir}".`,
  );
}

function buildDecoupledEnv(wpUrl, extraEnv = {}) {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    FORGEWP_DEPLOYMENT_MODE: 'decoupled',
    NEXT_TELEMETRY_DISABLED: '1',
    ...extraEnv,
  };
  delete env.FORGEWP_NATIVE_EXPORT;
  if (wpUrl) {
    env.FORGEWP_WP_URL = String(wpUrl).replace(/\/+$/, '');
  }
  return env;
}

/**
 * Run a production `next build` in decoupled mode against `wpUrl`.
 * @param {object} options
 * @param {string} options.projectDir
 * @param {string} [options.wpUrl]
 * @param {Record<string, string>} [options.extraEnv]
 * @param {string} [options.nextCliPath]
 * @param {number} [options.timeoutMs=180000]
 * @returns {Promise<{ ok: true, stdout: string, stderr: string }>}
 */
export async function buildDecoupledNextApp({
  projectDir,
  wpUrl = '',
  extraEnv = {},
  nextCliPath,
  timeoutMs = 180000,
}) {
  const resolvedDir = path.resolve(projectDir);
  const nextBin = nextCliPath || resolveNextCliBin(resolvedDir);
  const env = buildDecoupledEnv(wpUrl, extraEnv);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: resolvedDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      killChildTree(child).finally(() => {
        reject(new Error(`next build timed out after ${timeoutMs}ms\n${stdout}\n${stderr}`));
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ ok: true, stdout, stderr });
      } else {
        reject(new Error(`next build failed (exit ${code}):\n${stdout}\n${stderr}`));
      }
    });
  });
}

async function killChildTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    await Promise.race([exited, wait(3000)]);
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
  await Promise.race([exited, wait(2500)]);
  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
    await Promise.race([exited, wait(1500)]);
  }
}

/**
 * Start a decoupled Next.js production server (`next start`) and wait until it answers HTTP.
 * @param {object} options
 * @param {string} options.projectDir
 * @param {string} [options.wpUrl]
 * @param {number} [options.port]
 * @param {string} [options.host='127.0.0.1']
 * @param {string} [options.readyPath='/']
 * @param {Record<string, string>} [options.extraEnv]
 * @param {string} [options.nextCliPath]
 * @param {number} [options.readyTimeoutMs=30000]
 * @param {string[]} [options.spawnArgs] Custom args for `process.execPath` (used in tests)
 */
export async function startDecoupledNextServer({
  projectDir,
  wpUrl = '',
  port,
  host = '127.0.0.1',
  readyPath = '/',
  extraEnv = {},
  nextCliPath,
  readyTimeoutMs = 30000,
  spawnArgs,
}) {
  const resolvedDir = path.resolve(projectDir);
  const resolvedPort = port || (await getFreePort(host));
  const args = Array.isArray(spawnArgs)
    ? spawnArgs
    : [nextCliPath || resolveNextCliBin(resolvedDir), 'start', '-H', host, '-p', String(resolvedPort)];
  const env = buildDecoupledEnv(wpUrl, {
    PORT: String(resolvedPort),
    HOSTNAME: host,
    ...extraEnv,
  });

  const child = spawn(process.execPath, args, {
    cwd: resolvedDir,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let logs = '';
  child.stdout?.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    logs += chunk.toString();
  });

  const url = `http://${host}:${resolvedPort}`;
  const cleanReadyPath = readyPath.startsWith('/') ? readyPath : `/${readyPath}`;
  const deadline = Date.now() + readyTimeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Decoupled server exited early with code ${child.exitCode}:\n${logs}`,
      );
    }
    try {
      const res = await fetch(`${url}${cleanReadyPath}`, { redirect: 'manual' });
      if (res.status < 500) {
        return {
          url,
          port: resolvedPort,
          host,
          child,
          getLogs: () => logs,
          stop: () => killChildTree(child),
        };
      }
    } catch {
      // Server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await killChildTree(child);
  throw new Error(
    `Decoupled server at ${url}${cleanReadyPath} did not become ready within ${readyTimeoutMs}ms:\n${logs}`,
  );
}

/**
 * Build (unless `skipBuild`) and run a decoupled Next.js server around `fn(server)`.
 */
export async function withDecoupledNextServer(options, fn) {
  if (!options?.skipBuild) {
    await buildDecoupledNextApp(options);
  }
  const server = await startDecoupledNextServer(options);
  try {
    return await fn(server);
  } finally {
    await server.stop();
  }
}

/**
 * Normalize whitespace, NBSP, smart quotes, and zero-width characters for parity comparisons.
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeParityText(text) {
  return String(text ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a URL or path relative to `baseOrigins` and collapse trailing slashes (except `/`).
 * External URLs not matching `baseOrigins` are returned as-is.
 * @param {string} rawUrl
 * @param {string[]} [baseOrigins]
 * @returns {string}
 */
export function normalizeComparableUrlPath(rawUrl, baseOrigins = []) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '/';
  const normalizedOrigins = baseOrigins
    .map((o) => String(o || '').trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);

  let working = trimmed;
  if (/^https?:\/\//i.test(working)) {
    try {
      const parsed = new URL(working);
      const originLower = parsed.origin.toLowerCase();
      if (
        normalizedOrigins.length > 0 &&
        !normalizedOrigins.some((o) => originLower === o || working.toLowerCase().startsWith(`${o}/`))
      ) {
        return trimmed;
      }
      if (normalizedOrigins.length === 0) {
        return trimmed;
      }
      working = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return trimmed;
    }
  } else {
    for (const origin of normalizedOrigins) {
      if (working.toLowerCase().startsWith(origin)) {
        working = working.slice(origin.length) || '/';
        break;
      }
    }
  }

  const hashIdx = working.indexOf('#');
  const hash = hashIdx >= 0 ? working.slice(hashIdx) : '';
  const withoutHash = hashIdx >= 0 ? working.slice(0, hashIdx) : working;
  const queryIdx = withoutHash.indexOf('?');
  const search = queryIdx >= 0 ? withoutHash.slice(queryIdx) : '';
  let pathname = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash;

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  return `${pathname || '/'}${search}${hash}`;
}

function captureDomSnapshotInBrowser(opts) {
  const norm = (s) =>
    String(s ?? '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

  const html = document.documentElement ? document.documentElement.outerHTML : '';
  const headings = [...document.querySelectorAll('h1, h2, h3')]
    .map((el) => norm(el.textContent))
    .filter(Boolean);
  const navLinks = [...document.querySelectorAll('header a, nav a')].map((a) => ({
    text: norm(a.textContent),
    href: a.getAttribute('href') || a.href || '',
  }));

  const selectors = {};
  if (opts && opts.selectors && typeof opts.selectors === 'object') {
    for (const [key, sel] of Object.entries(opts.selectors)) {
      const el = document.querySelector(String(sel));
      selectors[key] = el ? norm(el.textContent) : null;
    }
  }

  const mainEl = document.querySelector('main') || document.body;
  return {
    url: location.href,
    pathname: location.pathname,
    lang: (document.documentElement.getAttribute('lang') || '').trim(),
    title: norm(document.title),
    h1: norm(document.querySelector('h1')?.textContent || ''),
    headings,
    navLinks,
    mainText: norm(mainEl ? mainEl.innerText || mainEl.textContent : ''),
    selectors,
    hydrationResources: window.forgeWpHydration?.resources ?? null,
    leaks: {
      nextRuntime: /\/_next\/static/.test(html),
      compileTokens: /__FORGEWP_[A-Z0-9_]+__|<forgewp-[a-z-]+/i.test(html),
      phpTags: /<\?php/i.test(html),
    },
    horizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}

/**
 * Build a self-contained browser JS expression for CDP `evaluate()` or Playwright `evaluate()`.
 * @param {{ selectors?: Record<string, string> }} [options]
 * @returns {string}
 */
export function buildDomSnapshotExpression(options = {}) {
  return `(${captureDomSnapshotInBrowser.toString()})(${JSON.stringify(options || {})})`;
}

/** Default self-contained browser snapshot expression (for `chrome.evaluate` / `page.evaluate`). */
export const BROWSER_DOM_SNAPSHOT_SCRIPT = buildDomSnapshotExpression();

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, '\u2019')
    .replace(/&lsquo;/gi, '\u2018')
    .replace(/&rdquo;/gi, '\u201D')
    .replace(/&ldquo;/gi, '\u201C');
}

function stripTagsToText(htmlFragment) {
  const withoutScripts = String(htmlFragment || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  return normalizeParityText(decodeHtmlEntities(withoutScripts.replace(/<[^>]+>/g, ' ')));
}

function extractTagTexts(html, tagNames) {
  const regex = new RegExp(`<(${tagNames.join('|')})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = stripTagsToText(match[2]);
    if (text) results.push(text);
  }
  return results;
}

function extractSimpleSelectorText(html, selector) {
  const trimmed = String(selector || '').trim();
  if (!trimmed) return null;

  let regex;
  if (trimmed.startsWith('#')) {
    const id = trimmed.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`<([a-z0-9-]+)\\b[^>]*\\bid=(?:"${id}"|'${id}')[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  } else if (trimmed.startsWith('.')) {
    const cls = trimmed.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`<([a-z0-9-]+)\\b[^>]*\\bclass=(?:"[^"]*\\b${cls}\\b[^"]*"|'[^']*\\b${cls}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  } else if (/^\[([a-z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/i.test(trimmed)) {
    const m = trimmed.match(/^\[([a-z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/i);
    const attr = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const val = m[2] ?? m[3] ?? m[4];
    const attrPattern =
      val !== undefined
        ? `\\b${attr}=(?:"${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"|'${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}')`
        : `\\b${attr}(?:=|\\s|>)`;
    regex = new RegExp(`<([a-z0-9-]+)\\b[^>]*${attrPattern}[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  } else {
    const tag = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`<(${tag})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  }

  const found = html.match(regex);
  return found ? stripTagsToText(found[2]) : null;
}

/**
 * Pure-Node HTML snapshot extractor for fast HTTP parity checks without a browser.
 * @param {string} html
 * @param {{ url?: string, baseOrigins?: string[], selectors?: Record<string, string> }} [options]
 */
export function extractDomSnapshotFromHtml(html, options = {}) {
  const rawHtml = String(html || '');
  const url = String(options.url || '/');
  const baseOrigins = Array.isArray(options.baseOrigins) ? options.baseOrigins : [];
  const htmlLangMatch = rawHtml.match(/<html\b[^>]*\blang=(?:"([^"]*)"|'([^']*)')/i);
  const titleMatch = rawHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const mainMatch =
    rawHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    rawHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);

  const navLinks = [];
  const navBlockRegex = /<(?:header|nav)\b[^>]*>([\s\S]*?)<\/(?:header|nav)>/gi;
  let navMatch;
  while ((navMatch = navBlockRegex.exec(rawHtml)) !== null) {
    const anchorRegex = /<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;
    while ((aMatch = anchorRegex.exec(navMatch[1])) !== null) {
      navLinks.push({
        text: stripTagsToText(aMatch[3]),
        href: normalizeComparableUrlPath(decodeHtmlEntities(aMatch[1] ?? aMatch[2] ?? ''), baseOrigins),
      });
    }
  }

  const selectors = {};
  if (options.selectors && typeof options.selectors === 'object') {
    for (const [key, sel] of Object.entries(options.selectors)) {
      selectors[key] = extractSimpleSelectorText(rawHtml, sel);
    }
  }

  const headings = extractTagTexts(rawHtml, ['h1', 'h2', 'h3']);
  let hydrationResources = null;
  const hydrationMatch = rawHtml.match(/window\.forgeWpHydration\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (hydrationMatch) {
    try {
      hydrationResources = JSON.parse(hydrationMatch[1])?.resources ?? null;
    } catch {
      hydrationResources = null;
    }
  }

  return {
    url,
    pathname: normalizeComparableUrlPath(url, baseOrigins),
    lang: (htmlLangMatch ? htmlLangMatch[1] ?? htmlLangMatch[2] ?? '' : '').trim(),
    title: titleMatch ? stripTagsToText(titleMatch[1]) : '',
    h1: extractTagTexts(rawHtml, ['h1'])[0] || '',
    headings,
    navLinks,
    mainText: stripTagsToText(mainMatch ? mainMatch[1] : rawHtml),
    selectors,
    hydrationResources,
    leaks: {
      nextRuntime: /\/_next\/static/.test(rawHtml),
      compileTokens: /__FORGEWP_[A-Z0-9_]+__|<forgewp-[a-z-]+/i.test(rawHtml),
      phpTags: /<\?php/i.test(rawHtml),
    },
    horizontalOverflow: false,
  };
}

/**
 * Compare a Native WordPress DOM snapshot against a Decoupled Next.js DOM snapshot.
 * @param {ReturnType<typeof extractDomSnapshotFromHtml>} nativeSnap
 * @param {ReturnType<typeof extractDomSnapshotFromHtml>} decoupledSnap
 * @param {object} [options]
 */
export function compareDomSnapshots(nativeSnap, decoupledSnap, options = {}) {
  const {
    route = '/',
    baseOrigins = [],
    compareLang = true,
    langMode = 'exact',
    compareTitle = true,
    compareH1 = true,
    compareHeadings = false,
    compareNavLinks = true,
    compareOverflow = false,
    requiredTexts = [],
    selectors,
  } = options;

  const diffs = [];
  const pushDiff = (field, nativeVal, decoupledVal, message) => {
    diffs.push({ field, native: nativeVal, decoupled: decoupledVal, message });
  };

  // 1. Native and decoupled hygiene checks
  if (nativeSnap?.leaks?.nextRuntime) {
    pushDiff('leaks.nextRuntime', true, false, 'Native HTML leaked /_next/static assets');
  }
  for (const side of [
    ['native', nativeSnap],
    ['decoupled', decoupledSnap],
  ]) {
    const [label, snap] = side;
    if (snap?.leaks?.compileTokens) {
      pushDiff(`${label}.leaks.compileTokens`, snap.leaks.compileTokens, false, `${label} HTML leaked ForgeWP compile tokens`);
    }
    if (snap?.leaks?.phpTags) {
      pushDiff(`${label}.leaks.phpTags`, snap.leaks.phpTags, false, `${label} HTML leaked raw <?php tags`);
    }
  }

  // 2. Language attribute
  if (compareLang) {
    const nLang = String(nativeSnap?.lang || '').trim().toLowerCase();
    const dLang = String(decoupledSnap?.lang || '').trim().toLowerCase();
    const matches =
      langMode === 'prefix'
        ? nLang.split('-')[0] === dLang.split('-')[0]
        : nLang === dLang;
    if (!matches) {
      pushDiff('lang', nativeSnap?.lang ?? '', decoupledSnap?.lang ?? '', `Document lang mismatch: "${nativeSnap?.lang}" vs "${decoupledSnap?.lang}"`);
    }
  }

  // 3. Title & H1
  if (compareTitle) {
    const nTitle = normalizeParityText(nativeSnap?.title);
    const dTitle = normalizeParityText(decoupledSnap?.title);
    if (nTitle !== dTitle) {
      pushDiff('title', nTitle, dTitle, `Title mismatch: "${nTitle}" vs "${dTitle}"`);
    }
  }

  if (compareH1) {
    const nH1 = normalizeParityText(nativeSnap?.h1);
    const dH1 = normalizeParityText(decoupledSnap?.h1);
    if (nH1 !== dH1) {
      pushDiff('h1', nH1, dH1, `H1 mismatch: "${nH1}" vs "${dH1}"`);
    }
  }

  // 4. Headings
  if (compareHeadings) {
    const nHeads = (nativeSnap?.headings || []).map(normalizeParityText);
    const dHeads = (decoupledSnap?.headings || []).map(normalizeParityText);
    if (JSON.stringify(nHeads) !== JSON.stringify(dHeads)) {
      pushDiff('headings', nHeads, dHeads, 'Heading hierarchy mismatch');
    }
  }

  // 5. Navigation links (origin + trailing-slash normalized)
  if (compareNavLinks) {
    const normalizeLinks = (list) =>
      (list || []).map((l) => ({
        text: normalizeParityText(l.text),
        href: normalizeComparableUrlPath(l.href, baseOrigins),
      }));
    const nLinks = normalizeLinks(nativeSnap?.navLinks);
    const dLinks = normalizeLinks(decoupledSnap?.navLinks);
    if (JSON.stringify(nLinks) !== JSON.stringify(dLinks)) {
      pushDiff('navLinks', nLinks, dLinks, 'Header/nav links mismatch');
    }
  }

  // 6. Selectors
  const selectorKeys = Array.isArray(selectors)
    ? selectors
    : Array.from(
        new Set([
          ...Object.keys(nativeSnap?.selectors || {}),
          ...Object.keys(decoupledSnap?.selectors || {}),
        ]),
      );
  for (const key of selectorKeys) {
    const nVal = nativeSnap?.selectors?.[key] ?? null;
    const dVal = decoupledSnap?.selectors?.[key] ?? null;
    if (normalizeParityText(nVal) !== normalizeParityText(dVal)) {
      pushDiff(`selectors.${key}`, nVal, dVal, `Selector "${key}" mismatch`);
    }
  }

  // 7. Required texts must be present in both modes
  for (const reqText of requiredTexts) {
    const cleanReq = normalizeParityText(reqText);
    const inNative = normalizeParityText(nativeSnap?.mainText).includes(cleanReq);
    const inDecoupled = normalizeParityText(decoupledSnap?.mainText).includes(cleanReq);
    if (!inNative || !inDecoupled) {
      pushDiff(
        'requiredTexts',
        inNative,
        inDecoupled,
        `Required text "${cleanReq}" missing (native=${inNative}, decoupled=${inDecoupled})`,
      );
    }
  }

  // 8. Overflow check
  if (compareOverflow) {
    if (nativeSnap?.horizontalOverflow || decoupledSnap?.horizontalOverflow) {
      pushDiff(
        'horizontalOverflow',
        Boolean(nativeSnap?.horizontalOverflow),
        Boolean(decoupledSnap?.horizontalOverflow),
        'Horizontal overflow detected',
      );
    }
  }

  return { ok: diffs.length === 0, route, diffs };
}

function normalizeJsonValue(val, nativeOrigin, decoupledOrigin) {
  if (typeof val !== 'string') return val;
  let out = val;
  if (nativeOrigin) {
    const cleanNative = String(nativeOrigin).replace(/\/+$/, '');
    if (cleanNative && out.startsWith(cleanNative)) {
      out = out.slice(cleanNative.length) || '/';
    }
  }
  if (decoupledOrigin) {
    const cleanDecoupled = String(decoupledOrigin).replace(/\/+$/, '');
    if (cleanDecoupled && out.startsWith(cleanDecoupled)) {
      out = out.slice(cleanDecoupled.length) || '/';
    }
  }
  return out;
}

/**
 * Deep-compare native hydration resource JSON against WordPress REST resource JSON
 * after `JSON.parse` (per `docs/resource-contracts.md` §4.5).
 * @param {unknown} nativeResource
 * @param {unknown} restResource
 * @param {{ ignoreKeys?: string[], nativeOrigin?: string, decoupledOrigin?: string }} [options]
 */
export function compareResourceJson(nativeResource, restResource, options = {}) {
  const { ignoreKeys = [], nativeOrigin = '', decoupledOrigin = '' } = options;
  const ignoreSet = new Set(ignoreKeys);
  const parseIfNeeded = (v) =>
    typeof v === 'string' ? JSON.parse(v) : JSON.parse(JSON.stringify(v ?? null));

  const left = parseIfNeeded(nativeResource);
  const right = parseIfNeeded(restResource);
  const diffs = [];

  const walk = (a, b, jsonPath) => {
    const na = normalizeJsonValue(a, nativeOrigin, decoupledOrigin);
    const nb = normalizeJsonValue(b, nativeOrigin, decoupledOrigin);
    if (Object.is(na, nb)) return;

    if (
      na === null ||
      nb === null ||
      typeof na !== 'object' ||
      typeof nb !== 'object' ||
      Array.isArray(na) !== Array.isArray(nb)
    ) {
      diffs.push({ path: jsonPath, native: na, rest: nb, reason: 'value_mismatch' });
      return;
    }

    if (Array.isArray(na)) {
      if (na.length !== nb.length) {
        diffs.push({
          path: `${jsonPath}.length`,
          native: na.length,
          rest: nb.length,
          reason: 'array_length_mismatch',
        });
      }
      const len = Math.min(na.length, nb.length);
      for (let i = 0; i < len; i++) {
        walk(na[i], nb[i], `${jsonPath}[${i}]`);
      }
      return;
    }

    const keys = Array.from(new Set([...Object.keys(na), ...Object.keys(nb)])).sort();
    for (const key of keys) {
      if (ignoreSet.has(key)) continue;
      const nextPath = `${jsonPath}.${key}`;
      if (!(key in na)) {
        diffs.push({ path: nextPath, native: undefined, rest: nb[key], reason: 'missing_in_native' });
      } else if (!(key in nb)) {
        diffs.push({ path: nextPath, native: na[key], rest: undefined, reason: 'missing_in_rest' });
      } else {
        walk(na[key], nb[key], nextPath);
      }
    }
  };

  walk(left, right, '$');
  return { ok: diffs.length === 0, diffs };
}

/**
 * Format route and resource parity results into a readable summary report.
 */
export function formatParityReport(routeResults = [], resourceResults = []) {
  const lines = ['### ForgeWP Cross-Mode Parity Report', ''];
  if (routeResults.length > 0) {
    lines.push('| Route | Status | Diffs |', '|---|---|---|');
    for (const r of routeResults) {
      lines.push(
        `| \`${r.route}\` | ${r.ok ? 'PASS' : 'FAIL'} | ${r.diffs.length === 0 ? 'none' : r.diffs.map((d) => d.message || d.field).join('; ')} |`,
      );
    }
    lines.push('');
  }
  if (resourceResults.length > 0) {
    lines.push('| Resource | Status | Diffs |', '|---|---|---|');
    for (const res of resourceResults) {
      lines.push(
        `| \`${res.resource}\` | ${res.ok ? 'PASS' : 'FAIL'} | ${res.diffs.length === 0 ? 'none' : res.diffs.map((d) => `${d.path} (${d.reason})`).join('; ')} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

function parseCliArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

async function runCli() {
  const flags = parseCliArgs(process.argv.slice(2));
  const projectDir = String(flags.project || process.cwd());
  const wpUrl = String(flags['wp-url'] || process.env.FORGEWP_WP_URL || '').replace(/\/+$/, '');
  const nativeUrl = String(flags['native-url'] || wpUrl).replace(/\/+$/, '');
  if (!wpUrl || !nativeUrl) {
    throw new Error(
      'Usage: node next-parity-helpers.js --project <dir> --wp-url <url> [--native-url <url>] [--routes /,/about] [--skip-build] [--port <n>] [--out <file>]',
    );
  }
  const routes = String(flags.routes || '/')
    .split(',')
    .map((r) => (r.trim().startsWith('/') ? r.trim() : `/${r.trim()}`))
    .filter(Boolean);

  const routeResults = await withDecoupledNextServer(
    {
      projectDir,
      wpUrl,
      port: flags.port ? Number(flags.port) : undefined,
      skipBuild: Boolean(flags['skip-build']),
    },
    async (server) => {
      const results = [];
      const baseOrigins = [nativeUrl, server.url];
      for (const route of routes) {
        const [nRes, dRes] = await Promise.all([
          fetch(`${nativeUrl}${route}`),
          fetch(`${server.url}${route}`),
        ]);
        const [nHtml, dHtml] = await Promise.all([nRes.text(), dRes.text()]);
        const nSnap = extractDomSnapshotFromHtml(nHtml, { url: route, baseOrigins });
        const dSnap = extractDomSnapshotFromHtml(dHtml, { url: route, baseOrigins });
        const comparison = compareDomSnapshots(nSnap, dSnap, { route, baseOrigins });
        if (nRes.status !== dRes.status) {
          comparison.diffs.push({
            field: 'status',
            native: nRes.status,
            decoupled: dRes.status,
            message: `HTTP status mismatch: ${nRes.status} vs ${dRes.status}`,
          });
          comparison.ok = false;
        }
        results.push(comparison);
      }
      return results;
    },
  );

  const reportText = formatParityReport(routeResults, []);
  console.log(reportText);
  if (flags.out) {
    const outPath = path.resolve(String(flags.out));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ routeResults }, null, 2), 'utf8');
  }
  if (routeResults.some((r) => !r.ok)) {
    process.exitCode = 1;
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMainModule) {
  runCli().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
  });
}
