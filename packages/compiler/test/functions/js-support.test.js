import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { afterEach, describe, expect, it } from 'vitest';
import { compileBlocks } from '../../lib/blocks/index.js';
import { loadMenusData } from '../../lib/functions/load-menus.js';
import { loadMockData } from '../../lib/functions/seed-mock-data.js';
import { loadConfig } from '../../lib/load-config.js';
import * as nextAdapter from '../../lib/next-adapter.js';
import { initNextProject } from '../../lib/next-init.js';
import {
  detectProjectLanguage,
  findWpConfigPath,
} from '../../lib/project-language.js';
import * as reactAdapter from '../../lib/react-adapter.js';
import { validateCriticalFiles } from '../../lib/validate.js';
import { linkWorkspaceForgeWPPackages } from './helpers/workspace-node-modules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREATE_FORGEWP_BIN = path.resolve(
  __dirname,
  '../../../create-forgewp/index.js',
);

let tmpRoot;

afterEach(() => {
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  tmpRoot = undefined;
});

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

function assertPureJsParses(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  expect(
    () =>
      parse(code, {
        sourceType: 'module',
        plugins: ['jsx'],
      }),
    `Expected pure JS/JSX (no TypeScript syntax) in ${filePath}`,
  ).not.toThrow();
}

describe('First-class JavaScript & JSX support across React and Next.js adapters', () => {
  it('loads wp.config.js, cms/mock-data.js, cms/menus.js, cms/forms/*.js, validates JS entries, and compiles JSX blocks', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-js-core-'));
    fs.mkdirSync(path.join(tmpRoot, 'cms', 'forms'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'src', 'app'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'src', 'blocks', 'CardBlock'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'js-core-theme', type: 'module' }),
    );
    fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<div id="root"></div>');
    fs.writeFileSync(path.join(tmpRoot, 'src', 'main.jsx'), 'export default null;\n');
    fs.writeFileSync(path.join(tmpRoot, 'src', 'app', 'layout.jsx'), 'export default null;\n');
    fs.writeFileSync(path.join(tmpRoot, 'src', 'app', 'routes.jsx'), 'export default null;\n');
    fs.writeFileSync(
      path.join(tmpRoot, 'wp.config.js'),
      `export default {
  configVersion: 1,
  name: 'JS Core Theme',
  slug: 'js-core-theme',
  version: '1.0.0',
  description: 'Pure JS theme',
  textDomain: 'js-core-theme',
};
`,
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'cms', 'mock-data.js'),
      `export const mockData = {
  post: [{ id: 1, slug: 'hello-js', title: 'Hello JS', content: '<p>Hi</p>' }],
};
export default mockData;
`,
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'cms', 'menus.js'),
      `export const menus = {
  primary: [{ id: 1, title: 'Home', url: '/' }],
};
export default menus;
`,
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'cms', 'forms', 'contact.js'),
      `export const form = defineWpForm({
  mailTo: 'admin',
  subject: 'JS Form',
  fields: {
    name: { type: 'text', label: 'Name', required: true },
  },
});
`,
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src', 'blocks', 'CardBlock', 'index.jsx'),
      `import { defineBlock, WpEditable } from '@forgewp/react';
export default defineBlock({
  name: 'card-block',
  title: 'Card Block',
  category: 'text',
  attributes: { heading: { type: 'string', default: 'Card' } },
  edit: ({ attributes, setAttributes }) => (
    <WpEditable tagName="h2" value={attributes.heading} onChange={(heading) => setAttributes({ heading })} />
  ),
  save: ({ attributes }) => <h2>{attributes.heading}</h2>,
});
`,
    );

    expect(findWpConfigPath(tmpRoot)?.fileName).toBe('wp.config.js');
    expect(detectProjectLanguage(tmpRoot)).toBe('js');

    const config = await loadConfig(tmpRoot);
    expect(config.slug).toBe('js-core-theme');
    expect(config.forms?.contact).toBeTruthy();

    expect(loadMockData(tmpRoot).post?.[0]?.slug).toBe('hello-js');
    expect(loadMenusData(tmpRoot).primary?.[0]?.title).toBe('Home');

    expect(() => validateCriticalFiles(tmpRoot, { restoreBlueprints: false })).not.toThrow();

    const outDir = path.join(tmpRoot, 'out-theme');
    fs.mkdirSync(outDir, { recursive: true });
    const compiled = compileBlocks(tmpRoot, outDir, {});
    expect(compiled.map((b) => b.name)).toContain('forgewp/card-block');
  });

  it('Next.js adapter: forgewp init and all 6 make:* hooks emit valid pure JS/JSX in JS projects', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-js-next-'));
    fs.mkdirSync(path.join(tmpRoot, 'src', 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'my-js-next-app', dependencies: { next: '^16.0.0', react: '^19.0.0' } }),
    );
    fs.writeFileSync(path.join(tmpRoot, 'jsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    fs.writeFileSync(
      path.join(tmpRoot, 'src', 'app', 'layout.jsx'),
      'export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }\n',
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src', 'app', 'page.jsx'),
      'export default function Home() { return <main><h1>Home</h1></main>; }\n',
    );

    initNextProject(tmpRoot);

    expect(fs.existsSync(path.join(tmpRoot, 'next.config.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'wp.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'cms', 'mock-data.js'))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'src', 'lib', 'content.js'))).toBe(true);

    // Exercise all 6 Next.js adapter make:* hooks
    await nextAdapter.onMakeBlock(tmpRoot, { pascalCase: 'PromoCard', attributesList: ['title', 'body'] });
    await nextAdapter.onMakePage(tmpRoot, { pascalCase: 'Pricing' });
    await nextAdapter.onMakeIsland(tmpRoot, { pascalCase: 'ThemeToggle' });
    await nextAdapter.onMakeForm(tmpRoot, { slug: 'contact', pascalCase: 'Contact', fields: ['name', 'email', 'message'] });
    await nextAdapter.onMakeLoop(tmpRoot, { pascalCase: 'BlogGrid', postType: 'post' });
    await nextAdapter.onMakeShell(tmpRoot, {
      pascalCase: 'SplitShell',
      nameSlug: 'split-shell',
      readableTitle: 'Split Shell',
      innerBlocks: { allowedBlocks: ['forgewp/promo-card'] },
    });

    const expectedJsFiles = [
      'next.config.mjs',
      'wp.config.js',
      'cms/mock-data.js',
      'src/lib/content.js',
      'src/blocks/PromoCard.jsx',
      'src/app/pricing/page.jsx',
      'src/components/ThemeToggle.jsx',
      'cms/forms/contact.js',
      'src/components/ContactForm.jsx',
      'src/components/BlogGrid.jsx',
      'src/blocks/SplitShell.jsx',
    ];
    for (const rel of expectedJsFiles) {
      const abs = path.join(tmpRoot, rel);
      expect(fs.existsSync(abs), `missing ${rel}`).toBe(true);
      assertPureJsParses(abs);
    }

    // Ensure zero .ts / .tsx files were created
    const tsFiles = walkFiles(tmpRoot).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    expect(tsFiles).toEqual([]);
  });

  it('React adapter: all 6 make:* hooks emit valid pure JS/JSX in JS projects', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-js-react-'));
    fs.writeFileSync(path.join(tmpRoot, 'jsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    fs.writeFileSync(
      path.join(tmpRoot, 'wp.config.js'),
      `export default { configVersion: 1, name: 'JS React', slug: 'js-react', version: '1.0.0', description: 'd', textDomain: 'js-react' };\n`,
    );

    const pc = {
      green: (s) => s,
      cyan: (s) => s,
      dim: (s) => s,
      yellow: (s) => s,
      bold: (s) => s,
      red: (s) => s,
    };

    const loggedLines = [];
    const origLog = console.log;
    console.log = (...args) => loggedLines.push(args.join(' '));
    try {
      reactAdapter.onMakeBlock(tmpRoot, { pascalCase: 'FeatureCard', attributesList: ['title'], readableTitle: 'Feature Card', pc });
      reactAdapter.onMakeShell(tmpRoot, {
        pascalCase: 'TwoColShell',
        nameSlug: 'two-col-shell',
        readableTitle: 'Two Col Shell',
        childrenSlugs: [],
        shell: { className: 'sec', gridClassName: 'grid' },
        innerBlocks: {},
        pc,
      });
      reactAdapter.onMakeLoop(tmpRoot, { pascalCase: 'ProjectGrid', postType: 'project', customFields: [], automaticallySeeded: false, pc });
      reactAdapter.onMakeIsland(tmpRoot, { pascalCase: 'NewsletterBox', pc });
      reactAdapter.onMakePage(tmpRoot, { pascalCase: 'Services', pc });
      reactAdapter.onMakeForm(tmpRoot, {
        slug: 'quote',
        pascalCase: 'Quote',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
        ],
        pc,
      });
    } finally {
      console.log = origLog;
    }

    const joinedLogs = loggedLines.join('\n');
    expect(joinedLogs).not.toMatch(/\.tsx?\b/);
    expect(joinedLogs).toContain('src/blocks/FeatureCard.jsx');
    expect(joinedLogs).toContain('cms/forms/quote.js');
    expect(joinedLogs).toContain('src/components/forms/QuoteForm.jsx');

    // Also test standalone bin/make-editable.js and bin/make-section.js in JS projects
    const makeEditableBin = path.resolve(__dirname, '../../bin/make-editable.js');
    const editableRun = spawnSync(
      process.execPath,
      [makeEditableBin, 'about-page', '--fields=hero_title:text,hero_sub:text'],
      { cwd: tmpRoot, encoding: 'utf8' },
    );
    expect(editableRun.status, editableRun.stderr).toBe(0);
    expect(editableRun.stdout).toContain('cms/editables/about-page.js');
    expect(editableRun.stdout).not.toMatch(/\.tsx?\b/);

    const makeSectionBin = path.resolve(__dirname, '../../bin/make-section.js');
    const sectionRun = spawnSync(
      process.execPath,
      [makeSectionBin, 'HeroBanner', '--page=home', '--fields=title:text,body:richText'],
      { cwd: tmpRoot, encoding: 'utf8' },
    );
    expect(sectionRun.status, sectionRun.stderr).toBe(0);
    expect(sectionRun.stdout).toContain('src/components/HeroBanner.jsx');
    expect(sectionRun.stdout).not.toMatch(/\.tsx?\b/);

    const expectedJsFiles = [
      'src/blocks/FeatureCard.jsx',
      'src/blocks/TwoColShell.jsx',
      'src/loops/ProjectGrid.jsx',
      'src/components/NewsletterBox.jsx',
      'src/app/pages/Services.jsx',
      'cms/forms/quote.js',
      'src/components/forms/QuoteForm.jsx',
      'cms/editables/about-page.js',
      'cms/editables/sections/hero-banner.js',
      'cms/editables/home.js',
      'src/components/HeroBanner.jsx',
    ];
    for (const rel of expectedJsFiles) {
      const abs = path.join(tmpRoot, rel);
      expect(fs.existsSync(abs), `missing ${rel}`).toBe(true);
      assertPureJsParses(abs);
    }

    // Also verify sync:routes updates src/app/routes.jsx and emits pure .jsx pages + CPT templates
    fs.mkdirSync(path.join(tmpRoot, 'cms'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'cms', 'mock-data.js'),
      `export const mockData = { post: [], project: [{ id: 1, title: 'Demo Project', content: '<p>Hi</p>' }] };\nexport default mockData;\n`,
    );
    fs.mkdirSync(path.join(tmpRoot, 'src', 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'src', 'app', 'routes.jsx'),
      `import { Switch, Route } from '@forgewp/react';\n\nexport default function AppRoutes() {\n  return (\n    <Switch>\n      {/* Fallback route */}\n      <Route>{() => <div>404</div>}</Route>\n    </Switch>\n  );\n}\n`,
    );

    const syncLogs = [];
    console.log = (...args) => syncLogs.push(args.join(' '));
    try {
      reactAdapter.onSyncRoutes(tmpRoot, {
        routesToScaffold: [{ path: '/about', title: 'About' }],
        isForce: false,
        pc: { ...pc, gray: (s) => s },
      });
    } finally {
      console.log = origLog;
    }

    const syncOutput = syncLogs.join('\n');
    expect(syncOutput).not.toMatch(/\.tsx?\b/);
    expect(syncOutput).toContain('src/app/routes.jsx');
    expect(syncOutput).not.toContain('not found');

    for (const rel of [
      'src/app/pages/AboutPage.jsx',
      'src/app/single-project.jsx',
      'src/app/pages/SingleProjectPage.jsx',
      'src/app/routes.jsx',
    ]) {
      const abs = path.join(tmpRoot, rel);
      expect(fs.existsSync(abs), `missing ${rel}`).toBe(true);
      assertPureJsParses(abs);
    }
    const updatedRoutes = fs.readFileSync(path.join(tmpRoot, 'src', 'app', 'routes.jsx'), 'utf8');
    expect(updatedRoutes).toContain('import { AboutPage } from "./pages/AboutPage";');
    expect(updatedRoutes).toContain('import { SingleProjectPage } from "./pages/SingleProjectPage";');
    expect(updatedRoutes).toContain('<Route path="/about" component={AboutPage} />');
    expect(updatedRoutes).toContain('<Route path="/project/:id" component={SingleProjectPage} />');

    // Also verify onFresh restores pure .jsx routes, page, and welcome components without creating any .tsx files
    const freshLogs = [];
    console.log = (...args) => freshLogs.push(args.join(' '));
    try {
      await reactAdapter.onFresh(tmpRoot);
    } finally {
      console.log = origLog;
    }
    const freshOutput = freshLogs.join('\n');
    expect(freshOutput).not.toMatch(/\.tsx?\b/);
    expect(fs.existsSync(path.join(tmpRoot, 'src', 'app', 'routes.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(tmpRoot, 'src', 'app', 'page.tsx'))).toBe(false);
    for (const rel of [
      'src/app/routes.jsx',
      'src/app/page.jsx',
      'src/components/brand-logos.jsx',
      'src/components/theme-hotkey.jsx',
    ]) {
      const abs = path.join(tmpRoot, rel);
      expect(fs.existsSync(abs), `missing ${rel}`).toBe(true);
      assertPureJsParses(abs);
    }
  });

  it('create-forgewp --js scaffolds valid pure JS/JSX projects for both react and nextjs adapters', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-create-js-'));

    for (const adapter of ['react', 'nextjs']) {
      const dirName = `demo-${adapter}-js`;
      const projectDir = path.join(tmpRoot, dirName);
      const run = spawnSync(
        process.execPath,
        [CREATE_FORGEWP_BIN, dirName, '--adapter', adapter, '--js', '--yes', '--no-install'],
        { cwd: tmpRoot, encoding: 'utf8' },
      );
      expect(run.status, `${adapter}: ${run.stderr}\n${run.stdout}`).toBe(0);

      const files = walkFiles(projectDir);
      expect(files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))).toEqual([]);
      expect(fs.existsSync(path.join(projectDir, 'jsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, 'wp.config.js'))).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.devDependencies?.typescript).toBeUndefined();
      expect(pkg.devDependencies?.['@types/react']).toBeUndefined();

      if (adapter === 'nextjs') {
        expect(fs.existsSync(path.join(projectDir, 'next.config.mjs'))).toBe(true);
        expect(fs.existsSync(path.join(projectDir, 'src/app/page.jsx'))).toBe(true);
        expect(fs.existsSync(path.join(projectDir, 'src/components/WaveLines.jsx'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(projectDir, 'src/main.jsx'))).toBe(true);
        expect(fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8')).toContain('/src/main.jsx');
      }

      // Every single JS/JSX/MJS file in the scaffolded project must parse as pure JS/JSX
      const jsFiles = files.filter((f) => /\.(?:js|jsx|mjs)$/.test(f));
      expect(jsFiles.length).toBeGreaterThan(3);
      for (const rel of jsFiles) {
        assertPureJsParses(path.join(projectDir, rel));
      }

      // --no-install: resolve @forgewp/compiler/define-config from the workspace
      linkWorkspaceForgeWPPackages(projectDir);

      // Config loads & preflight passes cleanly
      const loaded = await loadConfig(projectDir);
      expect(loaded.slug).toBe(dirName);
      expect(() =>
        validateCriticalFiles(projectDir, {
          adapter: adapter === 'nextjs' ? nextAdapter : reactAdapter,
          restoreBlueprints: false,
        }),
      ).not.toThrow();

      // forgewp doctor passes with exit code 0 on JS projects
      const doctorBin = path.resolve(__dirname, '../../bin/doctor.js');
      const doctorRun = spawnSync(process.execPath, [doctorBin], {
        cwd: projectDir,
        encoding: 'utf8',
      });
      expect(doctorRun.status, `${adapter} doctor:\n${doctorRun.stdout}\n${doctorRun.stderr}`).toBe(0);
    }
  });
});
