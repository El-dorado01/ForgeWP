import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { diagnoseNextNativeCompatibility } from './next-adapter.js';

const NEXT_CONFIG_CANDIDATES = [
  'next.config.ts',
  'next.config.mjs',
  'next.config.js',
  'next.config.cjs',
];

function slugifyName(raw) {
  return (
    String(raw || 'my-forgewp-theme')
      .toLowerCase()
      .replace(/^@[^/]+\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-forgewp-theme'
  );
}

function titleCaseFromSlug(slug) {
  return String(slug || 'ForgeWP Theme')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Non-destructively wrap an existing Next.js config file source with `withForgeWP(...)`.
 * Idempotent: returns `{ changed: false, code }` if `withForgeWP` is already present.
 *
 * @param {string} source
 * @param {string} fileName
 * @returns {{ changed: boolean, code: string, reason?: string }}
 */
export function wrapNextConfigSource(source, fileName = 'next.config.ts') {
  if (/\bwithForgeWP\b/.test(source)) {
    return { changed: false, code: source, reason: 'already-wrapped' };
  }

  const isCjs =
    fileName.endsWith('.cjs') ||
    (/\bmodule\.exports\s*=/.test(source) && !/\bexport\s+default\b/.test(source));

  if (isCjs) {
    const requireLine = "const { withForgeWP } = require('@forgewp/react/next');\n";
    if (/\bmodule\.exports\s*=\s*/.test(source)) {
      const updated = source.replace(
        /\bmodule\.exports\s*=\s*([\s\S]+?);?\s*$/,
        (_, expr) => `module.exports = withForgeWP(${expr.trim()});\n`,
      );
      return { changed: true, code: `${requireLine}${updated}` };
    }
    return {
      changed: false,
      code: source,
      reason: 'unrecognized-cjs-export',
    };
  }

  const importLine = "import { withForgeWP } from '@forgewp/react/next';\n";
  if (/\bexport\s+default\s+/.test(source)) {
    const updated = source.replace(
      /\bexport\s+default\s+([\s\S]+?);?\s*$/,
      (_, expr) => `export default withForgeWP(${expr.trim()});\n`,
    );
    return { changed: true, code: `${importLine}${updated}` };
  }

  return {
    changed: false,
    code: source,
    reason: 'unrecognized-esm-export',
  };
}

/**
 * Inspect an existing Next.js App Router repository, report native vs. decoupled
 * compatibility upfront via `diagnoseNextNativeCompatibility()`, and optionally
 * apply non-destructive ForgeWP onboarding (wrapping `next.config.*` in `withForgeWP()`,
 * scaffolding `wp.config.ts`, `cms/mock-data.ts`, `src/lib/content.ts`, `.env.example`,
 * and adding `export` / `doctor` / `dev:decoupled` scripts to `package.json`).
 *
 * @param {string} projectRoot
 * @param {{ dryRun?: boolean, name?: string, slug?: string }} [options]
 */
export function initNextProject(projectRoot, options = {}) {
  const resolvedRoot = path.resolve(projectRoot);
  const dryRun = Boolean(options.dryRun);

  const pkgPath = path.join(resolvedRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found in ${resolvedRoot}.`);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const hasSrcApp = existsSync(path.join(resolvedRoot, 'src', 'app'));
  const hasRootApp = existsSync(path.join(resolvedRoot, 'app'));
  if (!hasSrcApp && !hasRootApp) {
    throw new Error(
      `Next.js App Router directory (src/app/ or app/) not found in ${resolvedRoot}. ForgeWP's Next.js adapter requires the App Router.`,
    );
  }

  const compatibility = diagnoseNextNativeCompatibility(resolvedRoot);
  const recommendedMode = compatibility.ok ? 'native' : 'decoupled';

  const slug = slugifyName(options.slug || pkg.name || path.basename(resolvedRoot));
  const themeName = options.name || titleCaseFromSlug(slug);

  /** @type {Array<{ file: string, action: 'create' | 'update' | 'skip', detail: string }>} */
  const actions = [];

  // 1. Wrap or create next.config.*
  const existingNextConfig = NEXT_CONFIG_CANDIDATES.find((rel) =>
    existsSync(path.join(resolvedRoot, rel)),
  );
  if (existingNextConfig) {
    const absPath = path.join(resolvedRoot, existingNextConfig);
    const original = readFileSync(absPath, 'utf8');
    const wrapped = wrapNextConfigSource(original, existingNextConfig);
    if (wrapped.changed) {
      if (!dryRun) writeFileSync(absPath, wrapped.code, 'utf8');
      actions.push({
        file: existingNextConfig,
        action: 'update',
        detail: 'Wrapped Next.js config export with withForgeWP()',
      });
    } else {
      actions.push({
        file: existingNextConfig,
        action: 'skip',
        detail:
          wrapped.reason === 'already-wrapped'
            ? 'Already uses withForgeWP()'
            : `Could not auto-wrap (${wrapped.reason}); wrap manually with withForgeWP() from @forgewp/react/next`,
      });
    }
  } else {
    const absPath = path.join(resolvedRoot, 'next.config.ts');
    const code = `import type { NextConfig } from 'next';\nimport { withForgeWP } from '@forgewp/react/next';\n\nconst nextConfig: NextConfig = withForgeWP({});\n\nexport default nextConfig;\n`;
    if (!dryRun) writeFileSync(absPath, code, 'utf8');
    actions.push({
      file: 'next.config.ts',
      action: 'create',
      detail: 'Created next.config.ts wrapped in withForgeWP()',
    });
  }

  // 2. Scaffold wp.config.ts if missing
  const wpConfigPath = path.join(resolvedRoot, 'wp.config.ts');
  if (!existsSync(wpConfigPath)) {
    const wpConfigCode = `import { defineConfig } from '@forgewp/compiler/define-config';\n\nexport default defineConfig({\n  configVersion: 1,\n  name: ${JSON.stringify(themeName)},\n  slug: ${JSON.stringify(slug)},\n  version: '0.1.0',\n  description: ${JSON.stringify(`${themeName} — built with Next.js App Router and ForgeWP.`)},\n  textDomain: ${JSON.stringify(slug)},\n  frameworkAdapter: 'nextjs',\n});\n`;
    if (!dryRun) writeFileSync(wpConfigPath, wpConfigCode, 'utf8');
    actions.push({
      file: 'wp.config.ts',
      action: 'create',
      detail: 'Created ForgeWP configuration with frameworkAdapter: "nextjs"',
    });
  } else {
    actions.push({
      file: 'wp.config.ts',
      action: 'skip',
      detail: 'Already exists',
    });
  }

  // 3. Scaffold cms/mock-data.ts if neither .ts nor .json exists
  const mockDataTs = path.join(resolvedRoot, 'cms', 'mock-data.ts');
  const mockDataJson = path.join(resolvedRoot, 'cms', 'mock-data.json');
  if (!existsSync(mockDataTs) && !existsSync(mockDataJson)) {
    const mockCode = `import { defineWpPosts } from '@forgewp/react/config';\n\nexport const mockData = defineWpPosts({\n  page: [\n    {\n      id: 1,\n      slug: 'home',\n      title: ${JSON.stringify(themeName)},\n      content: '<p>Local WordPress fixture content for development.</p>',\n    },\n  ],\n});\n\nexport default mockData;\n`;
    if (!dryRun) {
      mkdirSync(path.dirname(mockDataTs), { recursive: true });
      writeFileSync(mockDataTs, mockCode, 'utf8');
    }
    actions.push({
      file: 'cms/mock-data.ts',
      action: 'create',
      detail: 'Created typed local WordPress fixture data',
    });
  } else {
    actions.push({
      file: 'cms/mock-data.ts',
      action: 'skip',
      detail: 'Mock data file already exists',
    });
  }

  // 4. Scaffold src/lib/content.ts (or lib/content.ts) if missing
  const contentRel = hasSrcApp ? 'src/lib/content.ts' : 'lib/content.ts';
  const contentAbs = path.join(resolvedRoot, contentRel);
  const mockImportPath = hasSrcApp ? '../../cms/mock-data' : '../cms/mock-data';
  if (!existsSync(contentAbs)) {
    const contentCode = `import { createWpServerClient } from '@forgewp/react/server';\nimport { mockData } from '${mockImportPath}';\n\nexport const wpClient = createWpServerClient({\n  fixtures: mockData,\n});\n\nexport async function getPageContent(slug: string) {\n  const page = await wpClient.getLivePage(slug);\n  return (\n    page ?? {\n      id: 0,\n      slug,\n      title: slug,\n      content: '',\n      blocks: [],\n      source: 'fixture' as const,\n    }\n  );\n}\n`;
    if (!dryRun) {
      mkdirSync(path.dirname(contentAbs), { recursive: true });
      writeFileSync(contentAbs, contentCode, 'utf8');
    }
    actions.push({
      file: contentRel,
      action: 'create',
      detail: 'Created unified @forgewp/react/server content client helper',
    });
  } else {
    actions.push({
      file: contentRel,
      action: 'skip',
      detail: 'Already exists',
    });
  }

  // 5. Scaffold .env.example if missing
  const envExamplePath = path.join(resolvedRoot, '.env.example');
  if (!existsSync(envExamplePath)) {
    const envCode = `# ForgeWP Next.js Deployment Configuration\n# Leave unset (or 'native') for static WordPress theme export via \`forgewp export\`.\n# Set to 'decoupled' to run Next.js as a live server backed by WordPress REST.\nFORGEWP_DEPLOYMENT_MODE=native\n\n# Live WordPress URL for decoupled mode (e.g. https://cms.example.com)\n# FORGEWP_WP_URL=\n\n# Optional WordPress Application Password ("username:xxxx xxxx xxxx") for draft previews (server-only)\n# FORGEWP_WP_AUTH=\n\n# Optional shared preview secret for gated draft routes (server-only)\n# FORGEWP_DRAFT_SECRET=\n`;
    if (!dryRun) writeFileSync(envExamplePath, envCode, 'utf8');
    actions.push({
      file: '.env.example',
      action: 'create',
      detail: 'Created deployment environment variable reference',
    });
  } else {
    actions.push({
      file: '.env.example',
      action: 'skip',
      detail: 'Already exists',
    });
  }

  // 6. Add missing scripts to package.json
  pkg.scripts = pkg.scripts || {};
  const addedScripts = [];
  if (!pkg.scripts.export) {
    pkg.scripts.export = 'forgewp export';
    addedScripts.push('export');
  }
  if (!pkg.scripts.doctor) {
    pkg.scripts.doctor = 'forgewp doctor';
    addedScripts.push('doctor');
  }
  if (!pkg.scripts['dev:decoupled']) {
    pkg.scripts['dev:decoupled'] = 'FORGEWP_DEPLOYMENT_MODE=decoupled next dev --webpack';
    addedScripts.push('dev:decoupled');
  }

  if (addedScripts.length > 0) {
    if (!dryRun) writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    actions.push({
      file: 'package.json',
      action: 'update',
      detail: `Added scripts: ${addedScripts.join(', ')}`,
    });
  } else {
    actions.push({
      file: 'package.json',
      action: 'skip',
      detail: 'Scripts already configured',
    });
  }

  return {
    projectRoot: resolvedRoot,
    dryRun,
    themeName,
    slug,
    compatibility,
    recommendedMode,
    actions,
  };
}
