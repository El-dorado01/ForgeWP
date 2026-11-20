import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import { diagnoseNextNativeCompatibility } from '../../lib/next-adapter.js';
import { discoverNextDynamicHierarchy } from '../../lib/next-dynamic-routes.js';
import { processMarkup } from '../../lib/markup-processor.js';
import { createWpServerClient, WpServerLoop } from '../../../react/src/server.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureNodeModules = path.join(
  repoRoot,
  'projects',
  'nextjs-adapter-fixture',
  'node_modules',
);

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

describe('Next.js dynamic App Router routes -> WordPress single.php / archive.php hierarchy', () => {
  it('allows single-segment [slug] routes with generateStaticParams() while still blocking catch-all and missing-params routes', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-dyn-diag-'));
    try {
      mkdirSync(path.join(tmp, 'src', 'app', 'blog', '[slug]'), { recursive: true });
      mkdirSync(path.join(tmp, 'src', 'app', 'projects', '[slug]'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'blog', 'page.tsx'),
        'export default function BlogArchive() { return null; }',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
        'export async function generateStaticParams() { return [{ slug: "hello" }]; }\nexport default function Post() { return null; }',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'projects', 'page.tsx'),
        'export default function ProjectsArchive() { return null; }',
      );
      writeFileSync(
        path.join(tmp, 'src', 'app', 'projects', '[slug]', 'page.tsx'),
        'export async function generateStaticParams() { return [{ slug: "loft" }]; }\nexport default function Project() { return null; }',
      );

      const hierarchy = discoverNextDynamicHierarchy(tmp, {
        postTypes: { project: { labels: { singular: 'Project', plural: 'Projects' } } },
      });
      expect(hierarchy.unsupportedDynamic).toEqual([]);
      expect(hierarchy.singleRoutes.map((r) => [r.basePath, r.postType, r.templateName])).toEqual([
        ['/blog', 'post', 'single'],
        ['/projects', 'project', 'single-project'],
      ]);
      expect(hierarchy.archiveRoutes.map((r) => [r.routePath, r.postType, r.templateName])).toEqual([
        ['/blog', 'post', 'archive'],
        ['/projects', 'project', 'archive-project'],
      ]);

      const cleanDiag = diagnoseNextNativeCompatibility(tmp);
      expect(cleanDiag.ok).toBe(true);
      expect(cleanDiag.errors).toEqual([]);

      // Catch-all [...slug] and missing generateStaticParams still fail with NEXT_NATIVE_DYNAMIC_ROUTE
      mkdirSync(path.join(tmp, 'src', 'app', 'docs', '[...slug]'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'docs', '[...slug]', 'page.tsx'),
        'export async function generateStaticParams() { return []; }\nexport default function Docs() { return null; }',
      );
      mkdirSync(path.join(tmp, 'src', 'app', 'no-params', '[slug]'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'src', 'app', 'no-params', '[slug]', 'page.tsx'),
        'export default function NoParams() { return null; }',
      );

      const blocked = diagnoseNextNativeCompatibility(tmp);
      expect(blocked.ok).toBe(false);
      const dynErrors = blocked.errors.filter((e) => e.code === 'NEXT_NATIVE_DYNAMIC_ROUTE');
      expect(dynErrors).toHaveLength(2);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('resolves getPosts, getLivePost, getStaticParams, and WpServerLoop across fixture and native export modes', async () => {
    const client = createWpServerClient({
      fixtures: {
        post: [
          {
            id: 10,
            slug: 'hello-world',
            title: 'Hello World',
            excerpt: 'Intro excerpt',
            content: '<p>Post body</p>',
            date: '2026-11-20',
            author: 'Ada',
          },
          {
            id: 11,
            slug: 'second-post',
            title: 'Second Post',
            excerpt: 'Second excerpt',
            content: '<p>Second body</p>',
          },
        ],
      },
    });

    const prevExport = process.env.FORGEWP_NATIVE_EXPORT;
    try {
      delete process.env.FORGEWP_NATIVE_EXPORT;
      const devParams = await client.getStaticParams('post');
      expect(devParams).toEqual([{ slug: 'hello-world' }, { slug: 'second-post' }]);

      const devPost = await client.getLivePost('post', 'hello-world');
      expect(devPost?.title).toBe('Hello World');
      expect(devPost?.permalink).toBe('/blog/hello-world');

      const devPosts = await client.getPosts('post');
      const devLoopHtml = renderToStaticMarkup(
        React.createElement(WpServerLoop, {
          postType: 'post',
          posts: devPosts,
          renderItem: (p) =>
            React.createElement(
              'article',
              { key: p.id },
              React.createElement('a', { href: p.permalink }, p.title),
            ),
        }),
      );
      expect(devLoopHtml).toContain('Hello World');
      expect(devLoopHtml).toContain('Second Post');

      // Native export mode emits 1 sample param + PHP compile tokens + loop markers
      process.env.FORGEWP_NATIVE_EXPORT = '1';
      const nativeParams = await client.getStaticParams('post');
      expect(nativeParams).toEqual([{ slug: 'hello-world' }]);

      const nativePost = await client.getLivePost('post', 'hello-world');
      expect(nativePost?.title).toBe('__FORGEWP_THE_TITLE__');
      expect(nativePost?.content).toBe('__FORGEWP_THE_CONTENT__');

      const nativeLoopHtml = renderToStaticMarkup(
        React.createElement(WpServerLoop, {
          postType: 'post',
          posts: [],
          useMainQuery: true,
          renderItem: (p) =>
            React.createElement(
              'article',
              { key: p.id },
              React.createElement('h2', null, React.createElement('a', { href: p.permalink }, p.title)),
              React.createElement('p', null, p.excerpt),
            ),
        }),
      );
      const compiledPhp = processMarkup(nativeLoopHtml, 'demo');
      expect(compiledPhp).toContain('<?php if (have_posts()) : while (have_posts()) : the_post(); ?>');
      expect(compiledPhp).toContain('<?php the_permalink(); ?>');
      expect(compiledPhp).toContain('get_the_title()');
      expect(compiledPhp).toContain('<?php the_excerpt(); ?>');
      expect(compiledPhp).toContain('<?php endwhile;');
    } finally {
      if (prevExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
      else process.env.FORGEWP_NATIVE_EXPORT = prevExport;
    }
  });

  it(
    'builds a real Next.js App Router app with /blog/[slug] and /projects/[slug] and exports single.php, archive.php, single-project.php, and archive-project.php executing live in PHP 8',
    async () => {
      if (!existsSync(nextFixtureNodeModules)) return;

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-next-dyn-export-'));
      try {
        const appDir = path.join(tmp, 'blog-theme');
        mkdirSync(path.join(appDir, 'src', 'app', 'blog', '[slug]'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'app', 'projects', '[slug]'), { recursive: true });
        mkdirSync(path.join(appDir, 'src', 'lib'), { recursive: true });
        mkdirSync(path.join(appDir, 'cms'), { recursive: true });

        writeFileSync(
          path.join(appDir, 'package.json'),
          JSON.stringify(
            {
              name: 'blog-theme',
              private: true,
              type: 'module',
              scripts: { build: 'next build --webpack' },
            },
            null,
            2,
          ),
        );
        writeFileSync(
          path.join(appDir, 'tsconfig.json'),
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2017',
                lib: ['dom', 'dom.iterable', 'esnext'],
                allowJs: true,
                skipLibCheck: true,
                strict: true,
                noEmit: true,
                esModuleInterop: true,
                module: 'esnext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: 'react-jsx',
                plugins: [{ name: 'next' }],
                paths: { '@/*': ['./src/*'] },
              },
              include: ['**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
              exclude: ['node_modules', '.forgewp', 'out'],
            },
            null,
            2,
          ),
        );
        writeFileSync(
          path.join(appDir, 'next.config.ts'),
          `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({});\n`,
        );
        writeFileSync(
          path.join(appDir, 'wp.config.ts'),
          `import { defineConfig } from '@forgewp/compiler/define-config';
export default defineConfig({
  configVersion: 1,
  name: 'Blog & Projects Theme',
  slug: 'blog-projects-theme',
  version: '1.0.0',
  description: 'Next.js dynamic routes test theme',
  textDomain: 'blog-projects-theme',
  frameworkAdapter: 'nextjs',
  postTypes: {
    project: {
      labels: { singular: 'Project', plural: 'Projects' },
      public: true,
      hasArchive: true,
      showInRest: true,
    },
  },
});
`,
        );
        writeFileSync(
          path.join(appDir, 'cms', 'mock-data.ts'),
          `import { defineWpPosts } from '@forgewp/react/config';
export const mockData = defineWpPosts({
  page: [{ id: 1, slug: 'home', title: 'Home', content: '<p>Welcome</p>' }],
  post: [{ id: 10, slug: 'launch-day', title: 'Launch Day', excerpt: 'We launched!', content: '<p>Launch body</p>' }],
  project: [{ id: 20, slug: 'alpine-villa', title: 'Alpine Villa', excerpt: 'Mountain design', content: '<p>Villa details</p>' }],
});
export default mockData;
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'lib', 'content.ts'),
          `import { createWpServerClient } from '@forgewp/react/server';
import { mockData } from '../../cms/mock-data';
export const wpClient = createWpServerClient({ fixtures: mockData });
`,
        );
        writeFileSync(path.join(appDir, 'src', 'app', 'globals.css'), 'body{margin:0}\n');
        writeFileSync(
          path.join(appDir, 'src', 'app', 'layout.tsx'),
          `import Link from 'next/link';
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header><nav><Link href="/">Home</Link></nav></header>
        {children}
        <footer>Footer</footer>
      </body>
    </html>
  );
}
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'app', 'page.tsx'),
          `import { BlockArea } from '@forgewp/react/server';
export default function HomePage() {
  return <main><h1>Home</h1><BlockArea name="home" /></main>;
}
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'app', 'blog', 'page.tsx'),
          `import { WpServerLoop } from '@forgewp/react/server';
import { wpClient } from '@/lib/content';
export default async function BlogArchivePage() {
  const posts = await wpClient.getPosts('post');
  return (
    <main className="blog-archive">
      <h1>Blog</h1>
      <WpServerLoop
        postType="post"
        posts={posts}
        renderItem={(post) => (
          <article key={post.id} className="post-card">
            <h2><a href={post.permalink}>{post.title}</a></h2>
            <p>{post.excerpt}</p>
          </article>
        )}
      />
    </main>
  );
}
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'app', 'blog', '[slug]', 'page.tsx'),
          `import { BlockArea } from '@forgewp/react/server';
import { wpClient } from '@/lib/content';
export async function generateStaticParams() {
  return wpClient.getStaticParams('post');
}
export default async function SinglePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await wpClient.getLivePost('post', slug);
  return (
    <main className="single-post">
      <h1>{post?.title}</h1>
      <BlockArea name="post-content" content={post?.content} />
    </main>
  );
}
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'app', 'projects', 'page.tsx'),
          `import { WpServerLoop } from '@forgewp/react/server';
import { wpClient } from '@/lib/content';
export default async function ProjectsArchivePage() {
  const projects = await wpClient.getPosts('project');
  return (
    <main className="projects-archive">
      <h1>Projects</h1>
      <WpServerLoop
        postType="project"
        posts={projects}
        renderItem={(proj) => (
          <article key={proj.id} className="project-card">
            <h2><a href={proj.permalink}>{proj.title}</a></h2>
            <p>{proj.excerpt}</p>
          </article>
        )}
      />
    </main>
  );
}
`,
        );
        writeFileSync(
          path.join(appDir, 'src', 'app', 'projects', '[slug]', 'page.tsx'),
          `import { BlockArea } from '@forgewp/react/server';
import { wpClient } from '@/lib/content';
export async function generateStaticParams() {
  return wpClient.getStaticParams('project');
}
export default async function SingleProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await wpClient.getLivePost('project', slug);
  return (
    <main className="single-project">
      <h1>{project?.title}</h1>
      <BlockArea name="project-content" content={project?.content} />
    </main>
  );
}
`,
        );

        // Link installed Next.js + @forgewp/react + @forgewp/compiler dependencies
        const appNodeModules = path.join(appDir, 'node_modules');
        mkdirSync(path.join(appNodeModules, '@forgewp'), { recursive: true });
        const linkType = process.platform === 'win32' ? 'junction' : 'dir';
        for (const entry of readdirSync(nextFixtureNodeModules)) {
          if (entry === '@forgewp') continue;
          symlinkSync(
            path.join(nextFixtureNodeModules, entry),
            path.join(appNodeModules, entry),
            linkType,
          );
        }
        symlinkSync(
          path.join(repoRoot, 'packages', 'react'),
          path.join(appNodeModules, '@forgewp', 'react'),
          linkType,
        );
        symlinkSync(
          path.join(repoRoot, 'packages', 'compiler'),
          path.join(appNodeModules, '@forgewp', 'compiler'),
          linkType,
        );

        const result = await exportTheme({
          themeRoot: appDir,
          packageManager: 'npm',
          validate: true,
          strict: true,
          zip: true,
        });

        // 1. WordPress hierarchy templates emitted; NO bogus static pages created for sample posts!
        expect(existsSync(path.join(result.outDir, 'single.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'archive.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'single-project.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'archive-project.php'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'forgewp-static', 'single.html'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'forgewp-static', 'archive.html'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'forgewp-static', 'single-project.html'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'forgewp-static', 'archive-project.html'))).toBe(true);
        expect(existsSync(path.join(result.outDir, 'page-blog-launch-day.php'))).toBe(false);
        expect(existsSync(path.join(result.outDir, 'page-projects-alpine-villa.php'))).toBe(false);
        expect(existsSync(path.join(result.outDir, 'page-blog.php'))).toBe(false);
        expect(existsSync(path.join(result.outDir, 'page-projects.php'))).toBe(false);

        // 2. Lint every generated PHP & static template with php -l
        const phpFiles = walkFiles(result.outDir).filter(
          (f) => f.endsWith('.php') || f.startsWith('forgewp-static/'),
        );
        for (const rel of phpFiles) {
          const lint = spawnSync('php', ['-l', path.join(result.outDir, rel)], { encoding: 'utf8' });
          expect(lint.status, `php -l failed on ${rel}: ${lint.stderr}`).toBe(0);
        }

        // 3. Execute single-project.php and archive-project.php in PHP 8 simulating real WordPress posts
        const phpDriver = path.join(tmp, 'run-hierarchy.php');
        writeFileSync(
          phpDriver,
          `<?php
$GLOBALS['tpl_dir'] = ${JSON.stringify(result.outDir)};
$GLOBALS['posts'] = array();
$GLOBALS['idx'] = -1;
$GLOBALS['current'] = null;
function get_template_directory() { return $GLOBALS['tpl_dir']; }
function get_header() { echo '<H>'; }
function get_footer() { echo '</F>'; }
function have_posts() { return ($GLOBALS['idx'] + 1) < count($GLOBALS['posts']); }
function the_post() { $GLOBALS['idx']++; $GLOBALS['current'] = $GLOBALS['posts'][$GLOBALS['idx']]; }
function get_the_title() { return $GLOBALS['current']['title']; }
function the_content() { echo $GLOBALS['current']['content']; }
function the_excerpt() { echo $GLOBALS['current']['excerpt']; }
function the_permalink() { echo $GLOBALS['current']['permalink']; }

function render_tpl($file, $posts) {
  $GLOBALS['posts'] = $posts;
  $GLOBALS['idx'] = -1;
  $GLOBALS['current'] = null;
  ob_start();
  include $GLOBALS['tpl_dir'] . '/' . $file;
  return ob_get_clean();
}

echo json_encode(array(
  'singlePost' => render_tpl('single.php', array(
    array('title' => 'Live WP Post Title', 'content' => '<p>Live WP Post Body</p>', 'excerpt' => '', 'permalink' => '/blog/live/'),
  )),
  'singleProject' => render_tpl('single-project.php', array(
    array('title' => 'Live CPT Project', 'content' => '<p>Live CPT Body</p>', 'excerpt' => '', 'permalink' => '/projects/live/'),
  )),
  'archiveProject' => render_tpl('archive-project.php', array(
    array('title' => 'Project One', 'content' => '', 'excerpt' => 'First summary', 'permalink' => '/projects/one/'),
    array('title' => 'Project Two', 'content' => '', 'excerpt' => 'Second summary', 'permalink' => '/projects/two/'),
  )),
));
`,
          'utf8',
        );
        const phpRun = spawnSync('php', [phpDriver], { encoding: 'utf8' });
        expect(phpRun.status, phpRun.stderr).toBe(0);
        const rendered = JSON.parse(phpRun.stdout);

        expect(rendered.singlePost).toContain('Live WP Post Title');
        expect(rendered.singlePost).toContain('<p>Live WP Post Body</p>');
        expect(rendered.singleProject).toContain('Live CPT Project');
        expect(rendered.singleProject).toContain('<p>Live CPT Body</p>');
        expect(rendered.archiveProject).toContain('Project One');
        expect(rendered.archiveProject).toContain('/projects/one/');
        expect(rendered.archiveProject).toContain('Project Two');
        expect(rendered.archiveProject).toContain('/projects/two/');
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
