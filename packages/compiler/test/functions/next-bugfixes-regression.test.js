import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import { generateTheme } from '../../lib/generate-theme.js';
import { processMarkup } from '../../lib/markup-processor.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import {
  clearNextExtractionCache,
  packageAssets,
  readBuildAssets,
  renderStaticMarkup,
} from '../../lib/next-adapter.js';
import {
  applyVerifiedNextLinksToMarkup,
  scanProjectNextLinks,
} from '../../lib/next-link-transform.js';
import {
  WpServerAuthGate,
  WpServerRequireAuth,
  createWpServerClient,
} from '../../../react/src/server.ts';

function extractPhpFunction(phpSource, functionName) {
  const start = phpSource.indexOf(`function ${functionName}(`);
  if (start === -1) throw new Error(`Function ${functionName} not found in generated PHP`);
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < phpSource.length; i++) {
    if (phpSource[i] === '{') {
      depth++;
      seenBrace = true;
    } else if (phpSource[i] === '}') {
      depth--;
      if (seenBrace && depth === 0) {
        return phpSource.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Unclosed function ${functionName}`);
}

const BASE_CONFIG = {
  configVersion: 1,
  name: 'Regression Test Theme',
  slug: 'regression-test-theme',
  version: '1.0.0',
  description: 'Next.js regression test suite',
  textDomain: 'regression-test-theme',
  frameworkAdapter: 'nextjs',
};

describe('Next.js adapter bugfix regressions (Bugs 1–7)', () => {
  it('Bug 1 & Bug 7: emits layout htmlClass/bodyClass and preserves route CSS & author head scripts under active SEO plugins across header.php, shell front-page, and blank pages', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-bug1-7-php-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outDir = path.join(tmp, 'theme');
      const dummyAdapter = {
        scanForHydrationIslands: () => [],
        packageAssets: async () => ({ assetFiles: {}, clientEntries: {}, runtimeEntry: undefined }),
      };

      const routes = [
        {
          path: '/',
          templateSlug: 'home',
          kind: 'home',
          title: 'Home',
          ownsShell: true,
          html: '<main data-forgewp-owns-shell="true"><h1>Shell Home</h1></main>',
          headHtml:
            '<title>Home SEO Title</title>' +
            '<meta name="description" content="SEO description"/>' +
            '<meta property="og:title" content="OG Home"/>' +
            '<link rel="canonical" href="https://example.com/"/>' +
            '<script type="application/ld+json">{"@type":"WebSite"}</script>' +
            '<link rel="stylesheet" href="https://example.com/assets/css/home-only.css" />' +
            '<link rel="preload" as="font" href="https://example.com/assets/fonts/inter.woff2" crossorigin="anonymous"/>' +
            '<style>.hero{color:red}</style>' +
            '<script>window.__themeInit="dark";</script>',
        },
        {
          path: '/landing',
          templateSlug: 'landing',
          kind: 'page',
          title: 'Landing',
          ownsShell: true,
          html: '<main><h1>Landing</h1></main>',
          headHtml:
            '<title>Landing SEO Title</title>' +
            '<meta name="description" content="Landing desc"/>' +
            '<link rel="stylesheet" href="https://example.com/assets/css/landing-only.css" />' +
            '<script>window.__landingReady=true;</script>',
        },
      ];

      await generateTheme({
        themeRoot: appDir,
        outDir,
        config: BASE_CONFIG,
        appHtml: routes[0].html,
        headHtml: routes[0].headHtml,
        headerHtml: '<header>Nav</header>',
        footerHtml: '<footer>Foot</footer>',
        routes,
        layout: {
          lang: 'en',
          htmlClass: '__variable_inter font-sans',
          bodyClass: 'fwp-page antialiased',
          sharedHeaderDetected: false,
          sharedFooterDetected: false,
        },
        adapter: dummyAdapter,
        assets: { cssFile: 'assets/app.css' },
      });

      for (const rel of ['header.php', 'front-page.php', 'page-landing.php']) {
        const lint = spawnSync('php', ['-l', path.join(outDir, rel)], { encoding: 'utf8' });
        expect(lint.status, `${rel}: ${lint.stderr}`).toBe(0);
      }

      // Execute header.php, shell-owned front-page.php, and blank-layout page-landing.php under PHP 8
      // both with an SEO plugin INACTIVE and ACTIVE.
      const runPhpHarness = (seoActive) => {
        const script = `<?php
$seo_active = ${seoActive ? 'true' : 'false'};
$slug_override = null;
function forgewp_seo_plugin_active() { global $seo_active; return $seo_active; }
function get_template_directory() { return ${JSON.stringify(outDir)}; }
function get_template_directory_uri() { return 'https://example.com/wp-content/themes/test'; }
function language_attributes() { echo 'lang="en"'; }
function bloginfo($k) { echo 'UTF-8'; }
function body_class($extra = '') {
  $classes = array('home');
  if (is_string($extra) && $extra !== '') {
    foreach (preg_split('/\\s+/', trim($extra)) as $c) { $classes[] = $c; }
  }
  echo 'class="' . htmlspecialchars(implode(' ', $classes), ENT_QUOTES, 'UTF-8') . '"';
}
function wp_head() {}
function wp_body_open() {}
function wp_footer() {}
function is_front_page() { return true; }
function is_page($s = '') { return true; }
function is_single() { return false; }
function is_404() { return false; }
function is_tax() { return false; }
function is_category() { return false; }
function is_tag() { return false; }
function is_post_type_archive() { return false; }
function is_archive() { return false; }
function have_posts() { return false; }
function get_queried_object_id() { return 0; }
function get_page_template_slug($id = 0) {
  global $slug_override;
  return $slug_override ? $slug_override : '';
}
function forgewp_resolve_head_target() {
  global $slug_override;
  $dir = get_template_directory() . '/forgewp-static';
  if ($slug_override === 'page-landing.php') {
    return $dir . '/template-landing-head.html';
  }
  return $dir . '/head.html';
}

ob_start();
include get_template_directory() . '/header.php';
$header_out = ob_get_clean();

ob_start();
include get_template_directory() . '/front-page.php';
$front_out = ob_get_clean();

$slug_override = 'page-landing.php';
ob_start();
include get_template_directory() . '/page-landing.php';
$landing_out = ob_get_clean();

echo json_encode(array('header' => $header_out, 'front' => $front_out, 'landing' => $landing_out));
`;
        const res = spawnSync('php', [], { encoding: 'utf8', input: script });
        expect(res.status, res.stderr).toBe(0);
        return JSON.parse(res.stdout);
      };

      const withSeoActive = runPhpHarness(true);
      for (const html of [withSeoActive.header, withSeoActive.front]) {
        expect(html).toContain('<html lang="en" class="__variable_inter font-sans">');
        expect(html).toContain('<body class="home fwp-page antialiased">');
        // Route CSS, preload, inline style, and author head script are preserved even when Yoast/RankMath is active!
        expect(html).toContain('home-only.css');
        expect(html).toContain('inter.woff2');
        expect(html).toContain('<style>.hero{color:red}</style>');
        expect(html).toContain('window.__themeInit="dark";');
        // SEO metadata IS yielded when an SEO plugin is active!
        expect(html).not.toContain('SEO description');
        expect(html).not.toContain('OG Home');
        expect(html).not.toContain('rel="canonical"');
        expect(html).not.toContain('application/ld+json');
      }
      expect(withSeoActive.landing).toContain('<html lang="en" class="__variable_inter font-sans">');
      expect(withSeoActive.landing).toContain('<body class="home fwp-page antialiased">');
      expect(withSeoActive.landing).toContain('landing-only.css');
      expect(withSeoActive.landing).toContain('window.__landingReady=true;');
      expect(withSeoActive.landing).not.toContain('Landing desc');

      const withSeoInactive = runPhpHarness(false);
      expect(withSeoInactive.header).toContain('<meta name="description" content="SEO description"/>');
      expect(withSeoInactive.header).toContain('application/ld+json');
      expect(withSeoInactive.header).not.toContain('<title>Home SEO Title</title>');
      expect(withSeoInactive.header).toContain('window.__themeInit="dark";');
      expect(withSeoInactive.header).toContain('home-only.css');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Bug 3: createWpServerClient() returns live REST posts and falls back cleanly on errors and siteInfo URL without "[object Object]"', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;

      const requests = [];
      const mockFetch = async (url) => {
        requests.push(String(url));
        if (String(url).includes('/wp-json/forgewp/v1/posts') && String(url).includes('type=post')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              type: 'post',
              page: 1,
              perPage: 5,
              total: 1,
              totalPages: 1,
              items: [
                {
                  id: 77,
                  type: 'post',
                  slug: 'live-release',
                  date: '2026-11-22T10:00:00',
                  modified: '2026-11-22T10:00:00',
                  title: 'Live Release',
                  excerpt: '<p>Short summary</p>',
                  permalink: 'https://cms.example.com/wp/blog/live-release/',
                  path: '/blog/live-release',
                  author: { id: 1, name: 'Ada Lovelace' },
                  featuredImage: { url: 'https://cms.example.com/hero.jpg', alt: '' },
                  terms: {},
                  protected: false,
                },
              ],
            }),
          };
        }
        if (String(url).includes('/wp-json/forgewp/v1/posts') && String(url).includes('type=project')) {
          return { ok: false, status: 500, json: async () => ({ message: 'Server error' }) };
        }
        if (String(url).includes('/wp-json/forgewp/v1/site-info')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              name: 'Decoupled Brand',
              description: 'From WordPress',
              language: 'en-US',
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      };

      const client = createWpServerClient({
        wpUrl: 'https://cms.example.com/wp',
        fetch: mockFetch,
        fixtures: {
          project: [
            { id: 1, slug: 'fixture-loft', title: 'Fixture Loft', excerpt: 'E', content: '<p>C</p>' },
          ],
        },
      });

      const livePosts = await client.getPosts('post', { perPage: 5 });
      expect(livePosts).toEqual([
        {
          id: 77,
          slug: 'live-release',
          postType: 'post',
          title: 'Live Release',
          excerpt: 'Short summary',
          content: '',
          date: '2026-11-22T10:00:00',
          author: 'Ada Lovelace',
          permalink: '/blog/live-release',
          featuredImage: 'https://cms.example.com/hero.jpg',
          blocks: [],
          source: 'wordpress',
        },
      ]);
      expect(requests[0]).toContain('/wp-json/forgewp/v1/posts?type=post&page=1&perPage=5');

      // Non-OK REST response must NOT throw TypeError; must fall back cleanly to fixtures.
      const fallbackProjects = await client.getPosts('project');
      expect(fallbackProjects).toHaveLength(1);
      expect(fallbackProjects[0]).toMatchObject({
        slug: 'fixture-loft',
        postType: 'project',
        source: 'fixture',
      });

      const siteInfo = await client.getSiteInfo();
      expect(siteInfo.mode).toBe('decoupled');
      expect(siteInfo.url).toBe('https://cms.example.com/wp');
      expect(siteInfo.homeUrl).toBe('https://cms.example.com/wp');
      expect(siteInfo.url).not.toContain('[object Object]');
      expect(siteInfo.homeUrl).not.toContain('[object Object]');
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
    }
  });

  it('Bug 4: WpServerAuthGate fallback and array allowed roles/capabilities compile to valid PHP and execute cleanly in PHP 8', async () => {
    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-bug4-auth-'));
    try {
      process.env.FORGEWP_NATIVE_EXPORT = '1';

      const gateHtml = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(
            WpServerAuthGate,
            { fallback: React.createElement('span', null, 'Please Log In') },
            React.createElement('span', null, 'Member Content'),
          ),
          React.createElement(
            WpServerAuthGate,
            {
              allowed: ['editor', 'administrator'],
              fallback: React.createElement('span', null, 'Admins Only'),
            },
            React.createElement('span', null, 'Editor Panel'),
          ),
        ),
      );

      expect(gateHtml).toContain('<forgewp-auth-gate-fallback>');
      expect(gateHtml).toContain('<forgewp-capability-gate-fallback>');

      // Also verify legacy -else tags compile cleanly
      const legacyGateHtml =
        '<forgewp-auth-gate-start></forgewp-auth-gate-start>In<forgewp-auth-gate-else></forgewp-auth-gate-else>Out<forgewp-auth-gate-end></forgewp-auth-gate-end>';

      const compiledPhp = processMarkup(gateHtml, 'demo-theme');
      const compiledLegacyPhp = processMarkup(legacyGateHtml, 'demo-theme');

      expect(compiledPhp).toContain("current_user_can( 'editor' ) || current_user_can( 'administrator' )");
      expect(compiledPhp).toContain('<?php else : ?>');
      expect(compiledLegacyPhp).toContain('<?php else : ?>');

      const tplPath = path.join(tmp, 'gates.php');
      writeFileSync(tplPath, compiledPhp, 'utf8');
      const lint = spawnSync('php', ['-l', tplPath], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);

      // Run in PHP 8 as logged-out vs editor
      const execPhp = (loggedIn, caps) => {
        const res = spawnSync('php', [], {
          encoding: 'utf8',
          input: `<?php
$logged = ${loggedIn ? 'true' : 'false'};
$caps = ${JSON.stringify(caps)};
function is_user_logged_in() { global $logged; return $logged; }
function current_user_can($c) { global $caps; return in_array($c, $caps, true); }
include ${JSON.stringify(tplPath)};
`,
        });
        expect(res.status, res.stderr).toBe(0);
        return res.stdout;
      };

      expect(execPhp(false, [])).toBe('<div><span>Please Log In</span><span>Admins Only</span></div>');
      expect(execPhp(true, ['subscriber'])).toBe('<div><span>Member Content</span><span>Admins Only</span></div>');
      expect(execPhp(true, ['editor'])).toBe('<div><span>Member Content</span><span>Editor Panel</span></div>');

      // Also verify WpServerRequireAuth with array allowed in generateTheme
      const reqHtml = renderToStaticMarkup(
        React.createElement(
          WpServerRequireAuth,
          { allowed: ['editor', 'administrator'], redirect: '/login' },
          React.createElement('main', null, 'Protected'),
        ),
      );
      const outDir = path.join(tmp, 'theme');
      await generateTheme({
        themeRoot: tmp,
        outDir,
        config: BASE_CONFIG,
        appHtml: '<main>Home</main>',
        routes: [
          { path: '/', templateSlug: 'home', kind: 'home', title: 'Home', html: '<main>Home</main>' },
          { path: '/secret', templateSlug: 'secret', kind: 'page', title: 'Secret', html: reqHtml },
        ],
        adapter: {
          scanForHydrationIslands: () => [],
          packageAssets: async () => ({ assetFiles: {}, clientEntries: {}, runtimeEntry: undefined }),
        },
        assets: { cssFile: 'assets/app.css' },
      });
      const secretPhp = readFileSync(path.join(outDir, 'page-secret.php'), 'utf8');
      expect(secretPhp).toContain("current_user_can( 'editor' ) || current_user_can( 'administrator' )");
      const secretLint = spawnSync('php', ['-l', path.join(outDir, 'page-secret.php')], { encoding: 'utf8' });
      expect(secretLint.status, secretLint.stderr).toBe(0);
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Bug 5: exportTheme() accepts pure JavaScript Next.js projects (wp.config.js without wp.config.ts)', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-bug5-js-export-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app'), { recursive: true });
      mkdirSync(path.join(tmp, 'out', '_next', 'static', 'css'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'js-next-export', type: 'module' }),
      );
      writeFileSync(
        path.join(tmp, 'wp.config.js'),
        `export default {
  configVersion: 1,
  name: 'JS Next Export',
  slug: 'js-next-export',
  version: '1.0.0',
  description: 'Pure JS Next.js export test',
  textDomain: 'js-next-export',
  frameworkAdapter: 'nextjs',
};
`,
      );
      writeFileSync(
        path.join(tmp, 'next.config.mjs'),
        `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'layout.jsx'),
        `export default function RootLayout({ children }) { return <html><body className="fwp-js-body">{children}</body></html>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'page.jsx'),
        `export default function Home() { return <main><h1>Pure JS Home</h1></main>; }\n`,
      );
      writeFileSync(
        path.join(tmp, 'out', '_next', 'static', 'css', 'app.css'),
        '.fwp-js-body{margin:0}',
      );
      writeFileSync(
        path.join(tmp, 'out', 'index.html'),
        '<!DOCTYPE html><html lang="en"><head><link rel="stylesheet" href="/_next/static/css/app.css"/><title>JS Next Home</title></head><body class="fwp-js-body"><main><h1>Pure JS Home</h1></main></body></html>',
      );

      clearNextExtractionCache(tmp);
      const res = await exportTheme({
        themeRoot: tmp,
        skipBuild: true,
        validate: true,
      });

      expect(res.config.slug).toBe('js-next-export');
      expect(existsSync(path.join(res.outDir, 'front-page.php'))).toBe(true);
      expect(readFileSync(path.join(res.outDir, 'header.php'), 'utf8')).toContain("body_class('fwp-js-body')");
    } finally {
      clearNextExtractionCache();
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Bug 6 & Bug 7: rewrites single/archive/hierarchy/useWpPageLink/archive links, strips empty identity markers, resolves CPT cache & dynamic/archive CSS', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-bug6-7-full-'));
    try {
      const appDir = path.join(tmp, 'app');
      const outExport = path.join(appDir, 'out');
      const themeOut = path.join(tmp, 'theme');
      mkdirSync(path.join(appDir, 'src', 'app', 'about'), { recursive: true });
      mkdirSync(path.join(appDir, 'src', 'app', 'blog', '[slug]'), { recursive: true });
      mkdirSync(path.join(appDir, 'src', 'app', 'projects', '[slug]'), { recursive: true });
      mkdirSync(path.join(outExport, '_next', 'static', 'css'), { recursive: true });
      mkdirSync(path.join(outExport, 'blog'), { recursive: true });
      mkdirSync(path.join(outExport, 'projects'), { recursive: true });

      writeFileSync(
        path.join(appDir, 'package.json'),
        JSON.stringify({ name: 'cpt-cache-test', type: 'module' }),
      );
      writeFileSync(
        path.join(appDir, 'wp.config.ts'),
        `export default {
  configVersion: 1,
  name: 'CPT Cache Test',
  slug: 'cpt-cache-test',
  version: '1.0.0',
  description: 'CPT CSS & link test',
  textDomain: 'cpt-cache-test',
  frameworkAdapter: 'nextjs',
  postTypes: {
    project: { hasArchive: true, labels: { singular: 'Project', plural: 'Projects' } },
  },
};
`,
      );
      writeFileSync(
        path.join(appDir, 'next.config.mjs'),
        `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'layout.tsx'),
        `import Link from 'next/link';
import { useWpPageLink } from '@forgewp/react';
export default function Layout({ children }: any) {
  const aboutHref = useWpPageLink('about', '/about');
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/about">LinkAbout</Link>
          <a href={aboutHref}>HookAbout</a>
          <Link href="/blog">BlogArchive</Link>
          <Link href="/projects">ProjectsArchive</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'page.tsx'),
        `import Link from 'next/link';
export default function Home() {
  return <main><Link href="/about">AboutLink</Link><a href="/about">RawAbout</a></main>;
}
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'about', 'page.tsx'),
        `import Link from 'next/link';
export default function About() {
  return <main><Link href="https://example.com">ExternalOnly</Link></main>;
}
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'blog', 'page.tsx'),
        `import Link from 'next/link';
export default function Blog() { return <main><Link href="/about">ReadAbout</Link></main>; }
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
        `import Link from 'next/link';
export async function generateStaticParams() { return [{ slug: 'hello' }]; }
export default function SinglePost() { return <main><Link href="/blog">BackToBlog</Link></main>; }
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'projects', 'page.tsx'),
        `import Link from 'next/link';
export default function Projects() { return <main><Link href="/about">AboutProjects</Link></main>; }
`,
      );
      writeFileSync(
        path.join(appDir, 'src', 'app', 'projects', '[slug]', 'page.tsx'),
        `import Link from 'next/link';
export async function generateStaticParams() { return [{ slug: 'alpha' }]; }
export default function SingleProject() { return <main><Link href="/projects">AllProjects</Link></main>; }
`,
      );

      for (const cssName of [
        'shared.css',
        'single-post.css',
        'archive-post.css',
        'single-project.css',
        'archive-project.css',
      ]) {
        writeFileSync(path.join(outExport, '_next', 'static', 'css', cssName), `/* ${cssName} */`);
      }

      const headerHtml =
        '<header>' +
        '<a data-forgewp-next-link="1" href="/about">LinkAbout</a>' +
        '<a href="/about">HookAbout</a>' +
        '<a data-forgewp-next-link="1" href="/blog">BlogArchive</a>' +
        '<a data-forgewp-next-link="1" href="/projects">ProjectsArchive</a>' +
        '</header>';
      const makeDoc = (title, cssFiles, body) =>
        `<!DOCTYPE html><html lang="en"><head>${cssFiles
          .map((c) => `<link rel="stylesheet" href="/_next/static/css/${c}"/>`)
          .join('')}<title>${title}</title></head><body>${headerHtml}${body}</body></html>`;

      writeFileSync(
        path.join(outExport, 'index.html'),
        makeDoc(
          'Home',
          ['shared.css'],
          '<main><a data-forgewp-next-link="1" href="/about">AboutLink</a><a href="/about">RawAbout</a></main>',
        ),
      );
      writeFileSync(
        path.join(outExport, 'about.html'),
        makeDoc(
          'About',
          ['shared.css'],
          '<main><a data-forgewp-next-link="1" href="https://example.com">ExternalOnly</a></main>',
        ),
      );
      writeFileSync(
        path.join(outExport, 'blog.html'),
        makeDoc(
          'Blog',
          ['shared.css', 'archive-post.css'],
          '<main><a data-forgewp-next-link="1" href="/about">ReadAbout</a></main>',
        ),
      );
      writeFileSync(
        path.join(outExport, 'blog', 'hello.html'),
        makeDoc(
          'Hello',
          ['shared.css', 'single-post.css'],
          '<main><a data-forgewp-next-link="1" href="/blog">BackToBlog</a></main>',
        ),
      );
      writeFileSync(
        path.join(outExport, 'projects.html'),
        makeDoc(
          'Projects',
          ['shared.css', 'archive-project.css'],
          '<main><a data-forgewp-next-link="1" href="/about">AboutProjects</a></main>',
        ),
      );
      writeFileSync(
        path.join(outExport, 'projects', 'alpha.html'),
        makeDoc(
          'Alpha',
          ['shared.css', 'single-project.css'],
          '<main><a data-forgewp-next-link="1" href="/projects">AllProjects</a></main>',
        ),
      );

      clearNextExtractionCache(appDir);
      // Warm cache via readBuildAssets FIRST (previously poisoned cache without postTypes!)
      const buildAssets = await readBuildAssets(appDir);
      expect(buildAssets.cssFile).toBe('assets/shared.css');

      // renderStaticMarkup must still see CPT hierarchy templates (cache key includes postTypes!)
      const rendered = await renderStaticMarkup(appDir);
      expect(rendered.hierarchyTemplates?.map((t) => t.templateName).sort()).toEqual([
        'archive-project',
        'single-project',
      ]);

      // Bug 6: singleHtml, archiveHtml, and hierarchyTemplates all get rewritten;
      // raw <a href="/about"> in home stays untouched while HookAbout? wait:
      // in home <a href="/about"> vs useWpPageLink('about', '/about'):
      // HookAbout is rewritten from wpPageLinkHrefToToken ONLY when no matching next/link collides?
      // Wait: wpPageLinkHrefToToken rewrites unmarked useWpPageLink anchors; raw <a href="/contact"> with a DIFFERENT href than useWpPageLink stays untouched!
      // Let's also verify directly below with non-colliding raw href vs useWpPageLink!
      expect(rendered.singleHtml).toContain('__FORGEWP_ROUTELINK:~archive-post:');
      expect(rendered.archiveHtml).toContain('__FORGEWP_ROUTELINK:about:');
      const singleProj = rendered.hierarchyTemplates.find((t) => t.templateName === 'single-project');
      const archiveProj = rendered.hierarchyTemplates.find((t) => t.templateName === 'archive-project');
      expect(singleProj.html).toContain('__FORGEWP_ROUTELINK:~archive-project:');
      expect(archiveProj.html).toContain('__FORGEWP_ROUTELINK:about:');
      // External-only page must still strip data-forgewp-next-link="1"
      const aboutRoute = rendered.routes.find((r) => r.path === '/about');
      expect(aboutRoute.html).toContain('<a href="https://example.com">ExternalOnly</a>');
      expect(aboutRoute.html).not.toContain('data-forgewp-next-link');

      // Archive links /blog and /projects must NOT emit NEXT_LINK_UNKNOWN_ROUTE warnings!
      const scanned = scanProjectNextLinks(appDir, rendered.routes, {
        postTypes: { project: { hasArchive: true } },
      });
      expect(scanned.diagnostics.filter((d) => d.code === 'NEXT_LINK_UNKNOWN_ROUTE')).toEqual([]);

      // Bug 7: route-specific stylesheets for single, archive, single-project, archive-project
      // must be packaged into assets/css/ and linked into their respective *-head.html!
      const packaged = await packageAssets(appDir, themeOut);
      expect(packaged.assetFiles['_next/static/css/shared.css']).toBe('assets/shared.css');
      for (const cssName of [
        'single-post.css',
        'archive-post.css',
        'single-project.css',
        'archive-project.css',
      ]) {
        expect(existsSync(path.join(themeOut, 'assets', 'css', cssName))).toBe(true);
      }
      expect(rendered.singleHeadHtml).toContain('assets/css/single-post.css');
      expect(rendered.archiveHeadHtml).toContain('assets/css/archive-post.css');
      expect(singleProj.headHtml).toContain('assets/css/single-project.css');
      expect(archiveProj.headHtml).toContain('assets/css/archive-project.css');

      // Full theme generation writes archive-head.html, single-head.html, and hierarchy *-head.html
      await generateTheme({
        themeRoot: appDir,
        outDir: themeOut,
        config: {
          ...BASE_CONFIG,
          postTypes: { project: { hasArchive: true } },
        },
        ...rendered,
        preserveOutDir: true,
        adapter: {
          scanForHydrationIslands: () => [],
          packageAssets: async () => packaged,
        },
        assets: buildAssets,
      });

      expect(existsSync(path.join(themeOut, 'forgewp-static', 'archive-head.html'))).toBe(true);
      expect(
        readFileSync(path.join(themeOut, 'forgewp-static', 'archive-head.html'), 'utf8'),
      ).toContain('assets/css/archive-post.css');
      expect(
        readFileSync(path.join(themeOut, 'forgewp-static', 'single-project-head.html'), 'utf8'),
      ).toContain('assets/css/single-project.css');

      // Verify Bug 6 unmarked useWpPageLink alongside marked <Link> vs distinct raw <a>
      const mixed = applyVerifiedNextLinksToMarkup(
        {
          appHtml:
            '<nav><a data-forgewp-next-link="1" href="/contact">Link</a><a href="/contact">RawSame</a><a href="/terms">HookTerms</a></nav>',
          headerHtml: '',
          footerHtml: '',
          notFoundHtml: '',
          routes: [],
        },
        {
          links: [
            {
              owner: 'next-link',
              renderedHrefs: ['/contact'],
              resolution: { token: '__FORGEWP_ROUTELINK:contact:%2Fcontact%2F::__' },
            },
            {
              owner: 'forgewp-page-link',
              renderedHrefs: ['/terms'],
              resolution: { token: '__FORGEWP_ROUTELINK:terms:%2Fterms%2F::__' },
            },
          ],
        },
      );
      expect(mixed.markup.appHtml).toBe(
        '<nav><a href="__FORGEWP_ROUTELINK:contact:%2Fcontact%2F::__">Link</a><a href="/contact">RawSame</a><a href="__FORGEWP_ROUTELINK:terms:%2Fterms%2F::__">HookTerms</a></nav>',
      );

      // Verify PHP 8 execution of __archive__ route links
      const functionsPhp = buildFunctionsPhp(BASE_CONFIG, { cssFile: 'assets/shared.css' });
      const resolveRouteUrlFn = extractPhpFunction(functionsPhp, 'forgewp_resolve_route_url');
      const compiledHeader = processMarkup(rendered.headerHtml, BASE_CONFIG.textDomain);
      expect(compiledHeader).toContain("forgewp_resolve_route_url('__archive__:post'");
      expect(compiledHeader).toContain("forgewp_resolve_route_url('__archive__:project'");

      const archivePhpRes = spawnSync('php', [], {
        encoding: 'utf8',
        input: `<?php
function home_url($p = '') { return 'https://example.com/' . ltrim($p, '/'); }
function forgewp_resolve_route_page_id($s) { return 0; }
function get_option($k) { return $k === 'page_for_posts' ? 12 : ''; }
function get_permalink($id) { return $id === 12 ? 'https://example.com/news/' : ''; }
function get_post_type_archive_link($pt) { return $pt === 'project' ? 'https://example.com/our-projects/' : ''; }
${resolveRouteUrlFn}
echo json_encode(array(
  'post_archive' => forgewp_resolve_route_url('__archive__:post', '/blog/', '', ''),
  'project_archive' => forgewp_resolve_route_url('__archive__:project', '/projects/', '', ''),
  'fallback_archive' => forgewp_resolve_route_url('__archive__:case_study', '/cases/', '', ''),
));
`,
      });
      expect(archivePhpRes.status, archivePhpRes.stderr).toBe(0);
      expect(JSON.parse(archivePhpRes.stdout)).toEqual({
        post_archive: 'https://example.com/news/',
        project_archive: 'https://example.com/our-projects/',
        fallback_archive: 'https://example.com/cases/',
      });
    } finally {
      clearNextExtractionCache();
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
