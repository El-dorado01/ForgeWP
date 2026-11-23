import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BlockArea, createWpServerClient } from '../../../react/src/server.ts';
import { extractNextStaticMarkup } from '../../lib/next-route-extractor.js';
import { runStaticLintChecks } from '../../lib/hydration/static-lint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

describe('Cloud E2E Gemini gaps regression suite', () => {
  it('preserves HTML markup in WpServerPageRecord.content for <BlockArea> in both fixture and decoupled modes', async () => {
    const richHtml = '<h2>About Us</h2><p>Built with <strong>ForgeWP</strong>.</p><ul><li>Fast</li></ul>';

    // 1. Local fixture mode
    const fixtureClient = createWpServerClient({
      fixtures: {
        page: [{ id: 1, slug: 'about', title: 'About', content: richHtml }],
      },
    });
    const fixturePage = await fixtureClient.getLivePage('about');
    expect(fixturePage?.content).toBe(richHtml);
    expect(fixturePage?.contentHtml).toBe(richHtml);

    const fixtureMarkup = renderToStaticMarkup(
      React.createElement(BlockArea, { name: 'about-content', content: fixturePage?.content }),
    );
    expect(fixtureMarkup).toContain('<h2>About Us</h2>');
    expect(fixtureMarkup).toContain('<strong>ForgeWP</strong>');
    expect(fixtureMarkup).toContain('<ul><li>Fast</li></ul>');

    // 2. Decoupled REST mode
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 7,
          slug: 'about',
          link: 'https://wp.example.com/about/',
          status: 'publish',
          title: { rendered: 'About' },
          content: { rendered: richHtml },
          excerpt: { rendered: '<p>Short summary</p>' },
        },
      ],
    }));
    const decoupledClient = createWpServerClient({
      wpUrl: 'https://wp.example.com',
      fetch: mockFetch,
    });
    const decoupledPage = await decoupledClient.getLivePage('about');
    expect(decoupledPage?.content).toBe(richHtml);
    expect(decoupledPage?.contentHtml).toBe(richHtml);
    expect(decoupledPage?.excerpt).toBe('Short summary');

    const decoupledMarkup = renderToStaticMarkup(
      React.createElement(BlockArea, { name: 'about-content', content: decoupledPage?.content }),
    );
    expect(decoupledMarkup).toBe(fixtureMarkup);
  });

  it('strips browser-title site-name suffixes when deriving auto-created WordPress page titles', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'forgewp-title-suffix-'));
    try {
      const outDir = path.join(root, 'out');
      mkdirSync(path.join(outDir, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outDir, 'contact'), { recursive: true });
      mkdirSync(path.join(outDir, 'pricing'), { recursive: true });
      mkdirSync(path.join(outDir, 'docs'), { recursive: true });
      writeFileSync(path.join(outDir, '_next', 'static', 'css', 'app.css'), 'body{}');

      const wrap = (title, body) =>
        `<!doctype html><html><head><link rel="stylesheet" href="/_next/static/css/app.css"/><title>${title}</title></head><body><header><nav>Nav</nav></header>${body}<footer>Foot</footer></body></html>`;

      writeFileSync(path.join(outDir, 'index.html'), wrap('E2e Next', '<main><h1>Home</h1></main>'));
      writeFileSync(
        path.join(outDir, 'contact', 'index.html'),
        wrap('Contact · E2e Next', '<main><h1>Contact</h1></main>'),
      );
      writeFileSync(
        path.join(outDir, 'pricing', 'index.html'),
        wrap('Pricing | E2e Next', '<main><h1>Plans</h1></main>'),
      );
      writeFileSync(
        path.join(outDir, 'docs', 'index.html'),
        wrap('Getting Started Guide', '<main><h1>Start</h1></main>'),
      );

      const markup = extractNextStaticMarkup(root);
      expect(markup.routes.find((r) => r.path === '/contact')?.title).toBe('Contact');
      expect(markup.routes.find((r) => r.path === '/pricing')?.title).toBe('Pricing');
      // Standalone custom title without site suffix is preserved verbatim
      expect(markup.routes.find((r) => r.path === '/docs')?.title).toBe('Getting Started Guide');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('produces zero hardcoded-URL static lint warnings on the fresh Next.js starter template', () => {
    const nextStarterRoot = path.join(repoRoot, 'packages', 'create-forgewp', 'template-nextjs');
    const violations = runStaticLintChecks(nextStarterRoot).filter(
      (v) => !String(v.message || '').includes('Missing SEO <WpHead>'),
    );
    expect(violations).toEqual([]);

    const pkg = JSON.parse(readFileSync(path.join(nextStarterRoot, 'package.json'), 'utf8'));
    expect(pkg.scripts['wp:doctor']).toBe('forgewp doctor');
  });
});
