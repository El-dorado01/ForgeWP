import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../lib/load-config.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { lintFormsUsage } from '../../lib/functions/forms.js';
import { generateTheme } from '../../lib/generate-theme.js';
import { processMarkup } from '../../lib/markup-processor.js';
import * as nextAdapter from '../../lib/next-adapter.js';
import {
  WpServerAuthGate,
  WpServerLoop,
  WpServerRequireAuth,
  createWpServerClient,
} from '../../../react/src/server.ts';

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

describe('Next.js optional module parity: Native Forms, SEO, Auth, and WooCommerce', () => {
  it('Native Forms: auto-discovers cms/forms/*.ts, lints root app/ usages, and generates valid PHP REST endpoints', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-forms-parity-'));
    try {
      mkdirSync(path.join(tmp, 'cms', 'forms'), { recursive: true });
      mkdirSync(path.join(tmp, 'app'), { recursive: true });

      writeFileSync(
        path.join(tmp, 'wp.config.ts'),
        `export default {
  configVersion: 1,
  name: 'Next Forms Parity',
  slug: 'next-forms-parity',
  version: '1.0.0',
  description: 'Forms parity test',
  textDomain: 'next-forms-parity',
  frameworkAdapter: 'nextjs',
};\n`,
      );

      writeFileSync(
        path.join(tmp, 'cms', 'forms', 'contact.ts'),
        `export const form = defineWpForm({
  mailTo: 'admin',
  subject: 'New inquiry from {name}',
  fields: {
    name: { type: 'text', label: 'Name', required: true },
    email: { type: 'email', label: 'Email', required: true },
  },
});\n`,
      );

      writeFileSync(
        path.join(tmp, 'app', 'page.tsx'),
        `export default function Contact() {
  async function onSubmit() {
    await submitWpForm('unknown_form', {});
  }
  return <form onSubmit={onSubmit}><input name="name" /></form>;
}\n`,
      );

      const config = await loadConfig(tmp);
      expect(config.forms?.contact).toBeTruthy();

      // lintFormsUsage must scan root-level app/ (without src/)
      const warnings = lintFormsUsage(tmp, config);
      expect(warnings.some((w) => w.includes('unknown_form'))).toBe(true);

      const php = buildFunctionsPhp(config, { cssFile: 'assets/index.css' });
      expect(php).toContain('forgewp_submission');
      expect(php).toContain('/forms/');

      const fnPath = path.join(tmp, 'functions.php');
      writeFileSync(fnPath, php, 'utf8');
      const lint = spawnSync('php', ['-l', fnPath], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Auth & SEO: compiles WpServerRequireAuth, WpServerAuthGate, auth-manifest.json, REST auth endpoints, and SEO plugin handoff for Next.js routes', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-auth-seo-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outDir = path.join(tmp, 'theme');
      mkdirSync(path.join(appDir, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(appDir, 'out', '_next', 'static', 'css'), { recursive: true });
      writeFileSync(
        path.join(appDir, 'out', '_next', 'static', 'css', 'app.css'),
        'body{margin:0}',
      );
      writeFileSync(
        path.join(appDir, 'out', 'index.html'),
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_next/static/css/app.css"/><title>Home</title></head><body><main>Home</main></body></html>',
      );

      // Dev mode: WpServerRequireAuth & WpServerAuthGate render children cleanly without PHP markers
      delete process.env.FORGEWP_NATIVE_EXPORT;
      const devAuthHtml = renderToStaticMarkup(
        React.createElement(
          WpServerRequireAuth,
          { allowed: 'manage_options', redirect: '/login' },
          React.createElement('h1', null, 'Admin Dashboard'),
        ),
      );
      expect(devAuthHtml).toBe('<h1>Admin Dashboard</h1>');

      // Native export mode: emits ForgeWP auth markers
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const dashboardHtml = renderToStaticMarkup(
        React.createElement(
          WpServerRequireAuth,
          { allowed: 'manage_options', redirect: '/login' },
          React.createElement(
            'main',
            null,
            React.createElement('h1', null, 'Dashboard'),
            React.createElement(
              WpServerAuthGate,
              {
                allowed: 'edit_posts',
                fallback: React.createElement('p', null, 'Restricted'),
              },
              React.createElement('p', null, 'Secret Editor Panel'),
            ),
          ),
        ),
      );

      expect(dashboardHtml).toContain('<forgewp-require-auth');
      expect(dashboardHtml).toContain('<forgewp-capability-gate-start');

      const config = {
        configVersion: 1,
        name: 'Next Auth SEO Theme',
        slug: 'next-auth-seo',
        version: '1.0.0',
        description: 'Auth and SEO parity test',
        textDomain: 'next-auth-seo',
        frameworkAdapter: 'nextjs',
        auth: {
          enabled: true,
          allowedOrigins: ['https://app.example.com'],
        },
        seo: {
          enabled: true,
        },
      };

      const routes = [
        {
          path: '/',
          templateSlug: 'home',
          kind: 'home',
          title: 'Home',
          html: '<main><h1>Home</h1></main>',
          headHtml:
            '<title>Home | ForgeWP</title><meta name="description" content="Home description"/><script type="application/ld+json">{"@type":"WebSite"}</script>',
          assets: { stylesheets: ['_next/static/css/app.css'], clientScripts: [], otherAssets: [] },
        },
        {
          path: '/dashboard',
          templateSlug: 'dashboard',
          kind: 'page',
          title: 'Dashboard',
          html: dashboardHtml,
          headHtml: '<title>Dashboard</title><meta property="og:title" content="Dashboard"/>',
          assets: { stylesheets: ['_next/static/css/app.css'], clientScripts: [], otherAssets: [] },
        },
      ];

      await generateTheme({
        themeRoot: appDir,
        outDir,
        config,
        appHtml: routes[0].html,
        headHtml: routes[0].headHtml,
        headerHtml: '<header><a href="/">Brand</a></header>',
        footerHtml: '<footer>Footer</footer>',
        routes,
        adapter: nextAdapter,
        assets: { cssFile: 'assets/app.css' },
      });

      // Auth manifest & PHP redirect guard emitted for /dashboard
      const manifestPath = path.join(outDir, 'auth-manifest.json');
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      expect(manifest.protectedPages).toEqual([
        { page: 'dashboard', allowed: 'manage_options', redirect: '/login' },
      ]);
      expect(manifest.authGates).toEqual([
        { page: 'dashboard', type: 'capability', allowed: 'edit_posts' },
      ]);

      const dashboardPhp = readFileSync(path.join(outDir, 'page-dashboard.php'), 'utf8');
      expect(dashboardPhp).toContain('is_user_logged_in()');
      expect(dashboardPhp).toContain('manage_options');
      expect(dashboardPhp).toContain('wp_safe_redirect');

      const dashboardStatic = readFileSync(
        path.join(outDir, 'forgewp-static', 'template-dashboard.html'),
        'utf8',
      );
      expect(dashboardStatic).toContain('current_user_can');
      expect(dashboardStatic).toContain('Secret Editor Panel');

      // SEO metadata preserved per route & guarded behind forgewp_seo_plugin_active()
      const headerPhp = readFileSync(path.join(outDir, 'header.php'), 'utf8');
      expect(headerPhp).toContain('forgewp_seo_plugin_active()');
      const homeHead = readFileSync(path.join(outDir, 'forgewp-static', 'head.html'), 'utf8');
      expect(homeHead).toContain('application/ld+json');
      const dashHead = readFileSync(
        path.join(outDir, 'forgewp-static', 'template-dashboard-head.html'),
        'utf8',
      );
      expect(dashHead).toContain('og:title');

      // Auth REST endpoints generated in functions.php & all PHP files lint cleanly
      const functionsPhp = readFileSync(path.join(outDir, 'functions.php'), 'utf8');
      expect(functionsPhp).toContain('/auth/login');
      expect(functionsPhp).toContain('/auth/logout');

      for (const rel of walkFiles(outDir).filter((f) => f.endsWith('.php'))) {
        const lint = spawnSync('php', ['-l', path.join(outDir, rel)], { encoding: 'utf8' });
        expect(lint.status, `${rel}: ${lint.stderr}`).toBe(0);
      }
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('WooCommerce: emits universal WooCommerce REST endpoints and compiles WpServerLoop(product) cleanly for Next.js', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-wc-parity-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({
          name: 'next-wc-theme',
          dependencies: { '@forgewp/woocommerce': '^0.1.0' },
        }),
      );
      const php = buildFunctionsPhp(
        {
          configVersion: 1,
          name: 'Next WooCommerce Theme',
          slug: 'next-wc-theme',
          version: '1.0.0',
          description: 'WooCommerce parity test',
          textDomain: 'next-wc-theme',
          frameworkAdapter: 'nextjs',
        },
        { cssFile: 'assets/index.css' },
        [],
        tmp,
      );

      expect(php).toContain('forgewp_cart_register_rest_routes');
      expect(php).toContain('forgewp_rest_query_products');
      expect(php).toContain("'/cart'");
      const fnPath = path.join(tmp, 'functions.php');
      writeFileSync(fnPath, php, 'utf8');
      const lint = spawnSync('php', ['-l', fnPath], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);

      // Server Component product listing works in both fixture & native export mode
      delete process.env.FORGEWP_NATIVE_EXPORT;
      const client = createWpServerClient({
        fixtures: {
          product: [
            { id: 1, slug: 'espresso-mug', title: 'Espresso Mug', excerpt: 'Ceramic' },
          ],
        },
      });
      const localProducts = await client.getPosts('product');
      expect(localProducts).toHaveLength(1);
      expect(localProducts[0].title).toBe('Espresso Mug');

      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const loopHtml = renderToStaticMarkup(
        React.createElement(WpServerLoop, {
          postType: 'product',
          useMainQuery: false,
          postsPerPage: 12,
          posts: localProducts,
          renderItem: (p) =>
            React.createElement('article', { key: p.id }, React.createElement('h2', null, p.title)),
        }),
      );
      const compiledPhp = processMarkup(loopHtml, 'next-wc-theme');
      expect(compiledPhp).toContain("'post_type' => 'product'");
      expect(compiledPhp).toContain('get_the_title()');

      const tplPath = path.join(tmp, 'shop-loop.php');
      writeFileSync(tplPath, compiledPhp, 'utf8');
      const tplLint = spawnSync('php', ['-l', tplPath], { encoding: 'utf8' });
      expect(tplLint.status, tplLint.stderr).toBe(0);
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
