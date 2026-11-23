import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BROWSER_DOM_SNAPSHOT_SCRIPT,
  buildDomSnapshotExpression,
  compareDomSnapshots,
  compareResourceJson,
  extractDomSnapshotFromHtml,
  formatParityReport,
  getFreePort,
  normalizeComparableUrlPath,
  normalizeParityText,
  startDecoupledNextServer,
  withDecoupledNextServer,
} from '../../lib/next-parity-helpers.js';

describe('R6: Next.js decoupled runner and DOM/resource parity helpers', () => {
  it('normalizes parity text and comparable URL paths across origins', () => {
    expect(normalizeParityText('  Ada\u2019s\u00A0\u201CStudio\u201D\u200B  ')).toBe(
      `Ada's "Studio"`,
    );

    const origins = ['http://localhost:8080', 'http://127.0.0.1:3000'];
    expect(normalizeComparableUrlPath('http://localhost:8080/', origins)).toBe('/');
    expect(normalizeComparableUrlPath('http://localhost:8080/about/', origins)).toBe('/about');
    expect(normalizeComparableUrlPath('http://127.0.0.1:3000/about?from=nav#team', origins)).toBe(
      '/about?from=nav#team',
    );
    expect(normalizeComparableUrlPath('/en/contact/', origins)).toBe('/en/contact');
    expect(normalizeComparableUrlPath('https://external.example.com/docs/', origins)).toBe(
      'https://external.example.com/docs/',
    );
  });

  it('extracts DOM snapshots from HTML and detects parity passes and failures', () => {
    const origins = ['http://localhost:8080', 'http://127.0.0.1:3000'];
    const nativeHtml = `<!doctype html>
      <html lang="en">
        <head><title>About &#8212; ForgeWP</title></head>
        <body>
          <header><nav><a href="http://localhost:8080/">Home</a><a href="http://localhost:8080/about/">About</a></nav></header>
          <main><h1>About Our Studio</h1><p data-testid="lead">Built for dual mode.</p></main>
        </body>
      </html>`;
    const decoupledHtml = `<!doctype html>
      <html lang="en">
        <head><title>About &#8212; ForgeWP</title><script src="/_next/static/chunks/app.js"></script></head>
        <body>
          <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
          <main><h1>About Our Studio</h1><p data-testid="lead">Built for dual mode.</p></main>
        </body>
      </html>`;

    const nativeSnap = extractDomSnapshotFromHtml(nativeHtml, {
      url: 'http://localhost:8080/about/',
      baseOrigins: origins,
      selectors: { lead: '[data-testid="lead"]' },
    });
    const decoupledSnap = extractDomSnapshotFromHtml(decoupledHtml, {
      url: 'http://127.0.0.1:3000/about',
      baseOrigins: origins,
      selectors: { lead: '[data-testid="lead"]' },
    });

    const pass = compareDomSnapshots(nativeSnap, decoupledSnap, {
      route: '/about',
      baseOrigins: origins,
      requiredTexts: ['Built for dual mode.'],
    });
    expect(pass.ok).toBe(true);
    expect(pass.diffs).toEqual([]);

    // Detect H1 drift, nav drift, locale drift, missing required text, and HTML leaks
    const brokenNative = extractDomSnapshotFromHtml(
      `<html lang="de"><head><title>Wrong</title><script src="/_next/static/x.js"></script></head><body><header><nav><a href="/home">Home</a></nav></header><main><h1>__FORGEWP_THE_TITLE__</h1><?php echo 1; ?></main></body></html>`,
      { url: '/about', baseOrigins: origins, selectors: { lead: '[data-testid="lead"]' } },
    );
    const fail = compareDomSnapshots(brokenNative, decoupledSnap, {
      route: '/about',
      baseOrigins: origins,
      requiredTexts: ['Built for dual mode.'],
    });
    expect(fail.ok).toBe(false);
    const fields = fail.diffs.map((d) => d.field);
    expect(fields).toContain('leaks.nextRuntime');
    expect(fields).toContain('native.leaks.compileTokens');
    expect(fields).toContain('native.leaks.phpTags');
    expect(fields).toContain('lang');
    expect(fields).toContain('title');
    expect(fields).toContain('h1');
    expect(fields).toContain('navLinks');
    expect(fields).toContain('selectors.lead');
    expect(fields).toContain('requiredTexts');

    // Browser expression string is valid JS syntax
    expect(BROWSER_DOM_SNAPSHOT_SCRIPT).toContain('window.forgeWpHydration');
    expect(buildDomSnapshotExpression({ selectors: { hero: 'h1' } })).toContain('"hero":"h1"');
  });

  it('compares native hydration JSON against REST JSON per §4.5', () => {
    const restRaw = '{"site":{"name":"Studio \\u00a9","url":"https:\\/\\/wp.test\\/about"},"options":{"phone":"123"},"ignored":"rest"}';
    const nativeObj = {
      site: { name: 'Studio \u00a9', url: 'https://wp.test/about' },
      options: { phone: '123' },
      ignored: 'native',
    };
    expect(
      compareResourceJson(nativeObj, restRaw, { ignoreKeys: ['ignored'] }),
    ).toEqual({ ok: true, diffs: [] });

    const crossOrigin = compareResourceJson(
      { path: 'http://localhost:8080/contact/' },
      { path: 'http://127.0.0.1:3000/contact/' },
      { nativeOrigin: 'http://localhost:8080', decoupledOrigin: 'http://127.0.0.1:3000' },
    );
    expect(crossOrigin.ok).toBe(true);

    const mismatch = compareResourceJson(
      { site: { name: 'A' }, menus: { primary: [{ path: '/' }] } },
      { site: { name: 'B' }, menus: { primary: [{ path: '/' }, { path: '/about' }] } },
    );
    expect(mismatch.ok).toBe(false);
    expect(mismatch.diffs).toEqual([
      { path: '$.menus.primary.length', native: 1, rest: 2, reason: 'array_length_mismatch' },
      { path: '$.site.name', native: 'A', rest: 'B', reason: 'value_mismatch' },
    ]);
  });

  it('starts, health-checks, and cleanly stops a decoupled server process', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-parity-srv-'));
    try {
      const srvScript = path.join(tmp, 'srv.mjs');
      writeFileSync(
        srvScript,
        `import http from 'node:http';
const port = Number(process.env.PORT);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body><h1>Decoupled OK ' + (process.env.FORGEWP_DEPLOYMENT_MODE || '') + '</h1></body></html>');
});
server.listen(port, '127.0.0.1');
`,
        'utf8',
      );
      const port = await getFreePort('127.0.0.1');
      const body = await withDecoupledNextServer(
        {
          projectDir: tmp,
          wpUrl: 'http://localhost:8080',
          port,
          skipBuild: true,
          spawnArgs: [srvScript],
          readyTimeoutMs: 10000,
        },
        async (srv) => {
          const res = await fetch(`${srv.url}/`);
          expect(res.status).toBe(200);
          return await res.text();
        },
      );
      expect(body).toContain('Decoupled OK decoupled');

      // Direct start/stop smoke check
      const srv = await startDecoupledNextServer({
        projectDir: tmp,
        wpUrl: 'http://localhost:8080',
        skipBuild: true,
        spawnArgs: [srvScript],
        readyTimeoutMs: 10000,
      });
      await srv.stop();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('formats readable parity report summaries', () => {
    const md = formatParityReport(
      [
        { route: '/', ok: true, diffs: [] },
        { route: '/about', ok: false, diffs: [{ field: 'h1', message: 'H1 mismatch' }] },
      ],
      [{ resource: 'site-settings', ok: true, diffs: [] }],
    );
    expect(md).toContain('| `/` | PASS | none |');
    expect(md).toContain('| `/about` | FAIL | H1 mismatch |');
    expect(md).toContain('| `site-settings` | PASS | none |');
  });
});
