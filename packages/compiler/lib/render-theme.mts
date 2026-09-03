import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire, register } from 'node:module';
import { isComponentInteractive } from './hydration/is-interactive.js';
import { getComponentRootClassName } from './hydration/root-class-extractor.js';
import {
  scanAppProviders,
  fileImportsProvider,
} from './hydration/scan-app-providers.js';
import { visibleFirstPaintProps } from './hydration/enter-hidden-initial.js';
import { loadMenusData } from './functions/load-menus.js';
import { loadMockData } from './functions/seed-mock-data.js';
import { loadProductsData } from './functions/seed-products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, 'asset-loader.js')).href);

const themeRoot = process.argv[2];

if (!themeRoot) {
  console.error('Usage: render-theme.mts <theme-root>');
  process.exit(1);
}

// Use the theme's own node_modules for ALL packages (React 19)
const require = createRequire(path.join(themeRoot, 'package.json'));
const React = require('react');
globalThis.React = React; // Polyfill for classic JSX transform in Node.js

// Resilient browser globals polyfills for Node SSR/compile-time rendering
if (typeof globalThis.window === 'undefined') {
  const mockLocation = {
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost/',
    origin: 'http://localhost',
    assign: () => {},
    replace: () => {},
    reload: () => {},
  };
  const mockMatchMedia = (query: string) => {
    // Do NOT report prefers-reduced-motion during compile-time SSR.
    // Components that branch on useReducedMotion() would bake the no-hover
    // fallback into static HTML and then never hydrate. Hover/CSS structure
    // must ship. First-paint visibility is handled by skipping enter-hidden
    // `initial` styles on motion nodes, not by lying about user preference.
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };

  globalThis.window = {
    location: mockLocation,
    navigator: { userAgent: 'Node' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    matchMedia: mockMatchMedia,
    _forgeWpCompileTime: true,
  } as any;
  globalThis.matchMedia = mockMatchMedia as any;
  globalThis.location = mockLocation as any;
  globalThis.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  } as any;
  globalThis.SVGElement = class SVGElement {} as any;

  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }

  const originalEncode = globalThis.encodeURIComponent;
  globalThis.encodeURIComponent = function (val: any): string {
    const str = String(val);
    if (
      str.includes('__FORGEWP_') &&
      !str.includes('_DEFAULT_') &&
      !str.includes('__FORGEWP_I18N_') &&
      !str.includes('__FORGEWP_OPTION_') &&
      !str.includes('__FORGEWP_THEME_MOD_')
    ) {
      return `__FORGEWP_URLENCODE_START__${str}__FORGEWP_URLENCODE_END__`;
    }
    return originalEncode ? originalEncode(str) : encodeURIComponent(str);
  };

  (globalThis.window as any)._forgeWpMockMenus = loadMenusData(themeRoot);
}

const { renderToStaticMarkup } = require('react-dom/server');

// ── Auto-Hydration Island Injection ─────────────────────────────────────────
// For Smart Discovery islands (components detected as interactive but with no explicit
// <Hydrate> wrapper), monkey-patch React.createElement to auto-wrap them with a
// data-forgewp-auto-island div during SSR. This lets generate-theme.js inject the
// proper data-forgewp-hydrate wrappers in the final HTML output.
import {
  scanForHydrationIslandsWithProps,
  findComponentPath,
} from './hydration/index.js';

const layoutProvidersForSsr = scanAppProviders(themeRoot);
const detailedIslandsForSsr = scanForHydrationIslandsWithProps(themeRoot);
const autoIslandNames = new Set(
  detailedIslandsForSsr
    .filter((i) => i.smartDiscovered)
    .map((i) => {
      // Convert kebab-name back to PascalCase component names for matching
      return i.name
        .split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
    }),
);
const autoIslandKebabByPascal = new Map<string, string>();
// Root className each Smart Discovery component's own outermost JSX element carries
// (when statically resolvable) — hoisted onto the wrapper div below so auto-hydration
// doesn't silently strip layout-critical classes (w-full, flex, grid, ...) from the tree.
const autoIslandRootClassByPascal = new Map<string, string>();
const autoIslandNeedsProviders = new Set<string>();
for (const island of detailedIslandsForSsr.filter((i) => i.smartDiscovered)) {
  const pascal = island.name
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  autoIslandKebabByPascal.set(pascal, island.name);
  if (island.rootClassName) {
    autoIslandRootClassByPascal.set(pascal, island.rootClassName);
  }
}
for (const island of detailedIslandsForSsr.filter((i) => i.smartDiscovered)) {
  const file = findComponentPath(themeRoot, island.name);
  if (file && fileImportsProvider(file, layoutProvidersForSsr)) {
    const pascal = island.name
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    autoIslandNeedsProviders.add(pascal);
  }
}

function hasRenderableChildren(props: any, childArgs: any[]): boolean {
  const list: any[] = [];
  if (childArgs && childArgs.length) list.push(...childArgs);
  if (props && props.children != null) {
    if (Array.isArray(props.children)) list.push(...props.children);
    else list.push(props.children);
  }
  return list.some((c) => {
    if (c == null || c === false || c === true) return false;
    if (typeof c === 'string') return c.trim().length > 0;
    if (typeof c === 'number') return true;
    if (React.isValidElement(c)) return true;
    if (Array.isArray(c))
      return c.some((x) => x != null && x !== false && x !== true);
    return false;
  });
}

const origCreate = React.createElement;
React.createElement = function patchedCreateElement(
  type: any,
  props: any,
  ...children: any[]
) {
  // Skip enter-hidden animation styles on static HTML so first paint is
  // visible. Handles both `initial={{ opacity: 0 }}` and `initial="hidden"`
  // + variants. Do not toggle useReducedMotion — that strips CSS hover
  // structures from any theme that branches on that hook.
  if (props) {
    props = visibleFirstPaintProps(props);
  }
  if (autoIslandNames.size > 0) {
    const name =
      typeof type === 'function' ? type.displayName || type.name : null;
    if (name && autoIslandNames.has(name)) {
      const kebab =
        autoIslandKebabByPascal.get(name) ||
        name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      const rootClassName = autoIslandRootClassByPascal.get(name);
      const inner = origCreate.call(this, type, props, ...children);
      const childStyle =
        props && typeof props.style === 'object' && props.style !== null
          ? props.style
          : {};
      const wrapperProps: Record<string, any> = {
        'data-forgewp-auto-island': kebab,
        style: {
          display: (childStyle && childStyle.display) || 'contents',
          ...childStyle,
        },
      };
      if (rootClassName) {
        wrapperProps.className = rootClassName;
      }
      // Forward the JSX call-site's actual props (e.g. searchPlaceholder) so
      // the client-side hydrator can mount the real component with them —
      // without this, the wrapper always hydrated with no props at all,
      // silently reverting to the component's own internal defaults.
      let serializedProps = '{}';
      if (props && typeof props === 'object') {
        const serializable: Record<string, any> = {};
        for (const [k, v] of Object.entries(props)) {
          if (typeof v === 'function') continue; // e.g. setAttributes, onChange
          if (v === undefined) continue;
          if (React.isValidElement(v)) continue; // nested elements, not init data
          serializable[k] = v;
        }
        try {
          serializedProps = JSON.stringify(serializable);
        } catch {
          serializedProps = '{}';
        }
      }
      wrapperProps['data-forgewp-auto-island-props'] = serializedProps;
      if (hasRenderableChildren(props, children)) {
        wrapperProps['data-forgewp-slot-children'] = 'true';
      }
      if (name && autoIslandNeedsProviders.has(name)) {
        wrapperProps['data-forgewp-needs-providers'] = 'true';
      }
      return origCreate.call(this, 'div', wrapperProps, inner);
    }
  }
  return origCreate.call(this, type, props, ...children);
};

const appUrl = pathToFileURL(
  path.join(themeRoot, 'src', 'app', 'page.tsx'),
).href;
const layoutUrl = pathToFileURL(
  path.join(themeRoot, 'src', 'app', 'layout.tsx'),
).href;
const layoutPath = path.join(themeRoot, 'src', 'app', 'layout.tsx');

// ── Load pages ────────────────────────────────────────────────────────────────
let App: any;
try {
  const module = await import(appUrl);
  App = module.default;
  if (!App) {
    throw new Error('Page component lacks a default export.');
  }
} catch (err: any) {
  console.error(
    `\n[ForgeWP Compiler Error] Failed to load the main Page component (src/app/page.tsx).`,
  );
  console.error(
    `Check for syntax errors, incorrect imports, or invalid references inside your page component.`,
  );
  console.error(`Error details: ${err.stack || err.message || err}\n`);
  process.exit(1);
}

let RootLayout: (props: any) => any = ({ children }: any) =>
  React.createElement(React.Fragment, null, children);
if (existsSync(layoutPath)) {
  try {
    const module = await import(layoutUrl);
    RootLayout = module.default;
    if (!RootLayout) {
      throw new Error('Root layout component lacks a default export.');
    }
  } catch (err: any) {
    console.error(
      `\n[ForgeWP Compiler Error] Failed to load the Root Layout component (src/app/layout.tsx).`,
    );
    console.error(
      `Check for syntax errors, incorrect imports, or invalid references inside your layout component.`,
    );
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
} else {
  console.warn(
    'RootLayout (src/app/layout.tsx) not found, using Fragment fallback',
  );
}

// ── Render a page inside RootLayout ──────────────────────────────────────────
let WpAuthProvider: any = null;
try {
  const authModule = require('@forgewp/auth');
  WpAuthProvider = authModule.WpAuthProvider;
} catch (e) {}

async function resolveLayoutComponent(
  layoutName?: string | false,
): Promise<any> {
  if (layoutName === false || layoutName === 'blank') {
    return React.Fragment;
  }
  const layoutsDir = path.join(themeRoot, 'src', 'app', 'layouts');
  if (existsSync(layoutsDir)) {
    const targetName = layoutName || 'default';
    const candidates = [
      path.join(layoutsDir, `${targetName}.tsx`),
      path.join(layoutsDir, `${targetName}.jsx`),
      path.join(layoutsDir, `${targetName}.ts`),
      path.join(layoutsDir, `${targetName}.js`),
      path.join(layoutsDir, `${targetName}/index.tsx`),
      path.join(layoutsDir, `${targetName}/index.jsx`),
    ];
    for (const cand of candidates) {
      if (existsSync(cand)) {
        try {
          const mod = await import(pathToFileURL(cand).href);
          const comp =
            mod.default ||
            Object.values(mod).find((v) => typeof v === 'function');
          if (comp) return comp;
        } catch (e: any) {
          console.warn(
            `[ForgeWP Compiler] Failed to import layout ${cand}:`,
            e.message,
          );
        }
      }
    }
  }
  // Fallback to RootLayout (src/app/layout.tsx)
  return RootLayout;
}

function wrapWithRootProviders(inner: any, LayoutComponent: any = RootLayout) {
  const ResolvedLayout = LayoutComponent || RootLayout;
  let element = React.createElement(ResolvedLayout, null, inner);
  if (ResolvedLayout !== RootLayout && ResolvedLayout !== React.Fragment) {
    element = React.createElement(RootLayout, null, element);
  }
  if (WpAuthProvider) {
    element = React.createElement(WpAuthProvider, null, element);
  }
  return element;
}

function renderPage(
  PageComponent: any,
  filePath?: string,
  LayoutComponent: any = RootLayout,
): string {
  try {
    let pageEl = React.createElement(PageComponent);
    if (filePath && existsSync(filePath) && isComponentInteractive(filePath)) {
      const compName = path.basename(filePath, path.extname(filePath));
      const kebabName = compName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
      const rootInfo = getComponentRootClassName(filePath);
      const wrapperProps: Record<string, any> = {
        'data-forgewp-auto-island': kebabName,
        style: { display: 'contents' },
      };
      if (rootInfo.resolvable && rootInfo.className) {
        wrapperProps.className = rootInfo.className;
      }
      pageEl = React.createElement('div', wrapperProps, pageEl);
    }
    const pageBoundary = React.createElement(
      'forgewp-content-boundary',
      null,
      pageEl,
    );
    return renderToStaticMarkup(
      wrapWithRootProviders(pageBoundary, LayoutComponent),
    );
  } catch (err: any) {
    console.error(
      `\n[ForgeWP Compiler Error] Server-Side Rendering (SSR) failed for Page Component.`,
    );
    console.error(
      `This typically happens if you use browser-only globals (like 'window', 'document', 'localStorage') at render-time, or if a component throws during execution.`,
    );
    console.error(
      `Ensure browser-specific logic is placed inside useEffect() or is executed only in the client.`,
    );
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
}

let textDomain = 'forgewp';
let themeConfig: any = {};
try {
  const wpConfigPath = path.join(themeRoot, 'wp.config.ts');
  if (existsSync(wpConfigPath)) {
    const wpConfigUrl = pathToFileURL(wpConfigPath).href;
    const configModule = await import(wpConfigUrl);
    themeConfig = configModule.default || configModule;
    if (themeConfig.textDomain) {
      textDomain = themeConfig.textDomain;
    }
  }
} catch (e) {
  // fallback if import fails
  try {
    const wpConfigPath = path.join(themeRoot, 'wp.config.ts');
    if (existsSync(wpConfigPath)) {
      const configContent = readFileSync(wpConfigPath, 'utf8');
      const domainMatch = configContent.match(
        /textDomain\s*:\s*['"]([^'"]+)['"]/,
      );
      if (domainMatch) {
        textDomain = domainMatch[1];
      }
    }
  } catch (e2) {}
}

function translateExpressionToPhp(
  expression: string,
  propName: string,
): string {
  expression = expression.trim();

  // 1. Check for useWpTitle()
  if (expression.includes('useWpTitle(')) {
    return `<?php echo esc_attr(get_the_title()); ?>`;
  }
  // 2. Check for useWpExcerpt()
  if (expression.includes('useWpExcerpt(')) {
    return `<?php echo esc_attr(get_the_excerpt()); ?>`;
  }
  // 3. Check for useWpFeaturedImage()
  if (expression.includes('useWpFeaturedImage(')) {
    return `<?php $wp_id = (isset($block) && is_object($block) && isset($block->context['postId'])) ? $block->context['postId'] : get_the_ID(); echo esc_url(get_the_post_thumbnail_url($wp_id, 'full')); ?>`;
  }
  // 4. Check for useWpPermalink()
  if (expression.includes('useWpPermalink(')) {
    return `<?php $wp_id = (isset($block) && is_object($block) && isset($block->context['postId'])) ? $block->context['postId'] : get_the_ID(); echo esc_url(get_permalink($wp_id)); ?>`;
  }
  // 5. Check for useWpCustomField / useWpField / useWpMeta
  const metaMatch = expression.match(
    /useWp(?:CustomField|Field|Meta)\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*([\s\S]+?))?\s*\)/,
  );
  if (metaMatch) {
    const key = metaMatch[1];
    const rawFallback = metaMatch[2];

    let fallbackPhp = '';
    if (rawFallback) {
      const trimmed = rawFallback.trim();
      const i18nMatch = trimmed.match(/__\(\s*['"]([^'"]+)['"]\s*\)/);
      if (i18nMatch) {
        fallbackPhp = ` ?: __('${i18nMatch[1].replace(/'/g, "\\'")}', 'hotelchecker24')`;
      } else if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
        fallbackPhp = ` ?: ${trimmed}`;
      } else {
        fallbackPhp = ` ?: ${trimmed}`;
      }
    }

    const isUrl =
      propName === 'canonical' ||
      propName === 'ogImage' ||
      key.includes('url') ||
      key.includes('image') ||
      key.includes('website');
    const escFn = isUrl ? 'esc_url' : 'esc_attr';
    return `<?php $wp_id = (isset($block) && is_object($block) && isset($block->context['postId'])) ? $block->context['postId'] : get_the_ID(); echo ${escFn}(get_post_meta($wp_id, '${key}', true)${fallbackPhp}); ?>`;
  }
  // 6. Check for useWpAuthor()
  if (expression.includes('useWpAuthor(')) {
    return `<?php echo esc_attr(get_the_author()); ?>`;
  }
  // 7. Check for useWpDate()
  if (expression.includes('useWpDate(')) {
    return `<?php echo esc_attr(get_the_date()); ?>`;
  }
  // 8. Check for useWpOption()
  const optionMatch = expression.match(/useWpOption\s*\(\s*['"]([^'"]+)['"]/);
  if (optionMatch) {
    const key = optionMatch[1];
    return `<?php echo esc_attr(get_option('${key}', '')); ?>`;
  }
  // 9. Check for useWpThemeMod()
  const themeModMatch = expression.match(
    /useWpThemeMod\s*\(\s*['"]([^'"]+)['"]/,
  );
  if (themeModMatch) {
    const key = themeModMatch[1];
    return `<?php echo esc_attr(get_theme_mod('${key}', '')); ?>`;
  }
  // 10. Check for useWpPageLink
  const pageLinkMatch = expression.match(
    /useWpPageLink\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/,
  );
  if (pageLinkMatch) {
    const templateName = pageLinkMatch[1];
    const fallbackUrl = pageLinkMatch[2];
    return `<?php $matched = get_pages(array('meta_key' => '_wp_page_template', 'meta_value' => 'page-${templateName.replace(/-page$/, '')}.php', 'number' => 1)); echo esc_url(!empty($matched) ? get_permalink($matched[0]->ID) : home_url('${fallbackUrl}')); ?>`;
  }
  // 11. Check for internationalization __()
  const i18nMatch = expression.match(/__\s*\(\s*['"]([^'"]+)['"]/);
  if (i18nMatch) {
    const str = i18nMatch[1];
    return `<?php echo esc_attr(__('${str}', '${textDomain}')); ?>`;
  }
  // 12. Check for literal string in quotes
  const literalMatch = expression.match(/^\s*['"]([^'"]+)['"]\s*$/);
  if (literalMatch) {
    return literalMatch[1];
  }
  return '';
}

function extractBalancedJsxExpression(src: string, propName: string): string {
  const marker = `${propName}={`;
  const index = src.indexOf(marker);
  if (index === -1) return '';
  let braces = 1;
  let start = index + marker.length;
  let i = start;
  while (braces > 0 && i < src.length) {
    if (src[i] === '{') braces++;
    else if (src[i] === '}') braces--;
    i++;
  }
  return src.slice(start, i - 1).trim();
}

function compileSchemaObject(schemaExpr: string, fileSrc: string): string {
  return schemaExpr.replace(
    /("[\w@]+"|[\w@]+)\s*:\s*([^,\n}]+)/g,
    (match, key, valStr) => {
      let val = valStr.trim();
      if (/^["']([^"']*)["']$/.test(val)) {
        return `${key}: ${val}`;
      }
      if (/^(true|false|[0-9.]+)$/i.test(val)) {
        return `${key}: ${val}`;
      }
      let resolved = val;
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val)) {
        const declRegex = new RegExp(
          `(?:const|let|var)\\s+${val}\\s*=\\s*([^;\\n]+)`,
        );
        const declMatch = fileSrc.match(declRegex);
        if (declMatch) {
          resolved = declMatch[1].trim();
        }
      }
      const phpVal = translateExpressionToPhp(resolved, '');
      if (phpVal) {
        return `${key}: "${phpVal}"`;
      }
      return `${key}: ${val}`;
    },
  );
}

// ── SEO extraction from source files (React 19 SSR-safe) ─────────────────────
// react-helmet-async v3 disabled server-side context for React 19 —
// HelmetProvider is a Fragment at SSR time so helmetContext.helmet is never set.
// Instead we parse <SEO .../> props directly from the source TSX file.

function extractSeoPropsFromSource(filePath: string): Record<string, string> {
  if (!filePath || !existsSync(filePath)) return {};

  let src = readFileSync(filePath, 'utf8');

  // Strip JSX block comments so we don't match <SEO /> mentions inside them
  src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Find the first <SEO ... /> or <WpHead ... /> (multiline, s flag)
  const seoMatch = src.match(/<(?:SEO|WpHead)\b([^>]*?)(?:\/>|>)/s);
  if (!seoMatch) {
    // If not found, let's look for local imports to follow
    const importRegex = /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
    let match;
    const dir = path.dirname(filePath);
    while ((match = importRegex.exec(src)) !== null) {
      const relativePath = match[1];
      // Try resolving with common extensions
      for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
        const resolvedPath = path.resolve(dir, relativePath + ext);
        if (existsSync(resolvedPath)) {
          const importedProps = extractSeoPropsFromSource(resolvedPath);
          if (Object.keys(importedProps).length > 0) {
            return importedProps; // Return the first matching props we find
          }
        }
      }
    }
    return {};
  }

  const attribsStr = seoMatch[1];
  const props: Record<string, string> = {};

  // Double-quoted values: prop="value with & and spaces"
  let m: RegExpExecArray | null;
  const dqPattern = /(\w+)\s*=\s*"([^"]*)"/g;
  while ((m = dqPattern.exec(attribsStr)) !== null) props[m[1]] = m[2];

  // Single-quoted values: prop='value'
  const sqPattern = /(\w+)\s*=\s*'([^']*)'/g;
  while ((m = sqPattern.exec(attribsStr)) !== null)
    if (!props[m[1]]) props[m[1]] = m[2];

  // JSX string expressions: prop={"value"} or prop={'value'}
  const jsxPattern = /(\w+)\s*=\s*\{["']([^"']*)["']\}/g;
  while ((m = jsxPattern.exec(attribsStr)) !== null)
    if (!props[m[1]]) props[m[1]] = m[2];

  // JSX brace expressions: prop={expression}
  const exprPattern = /(\w+)\s*=\s*\{([^}]*)\}/g;
  while ((m = exprPattern.exec(attribsStr)) !== null) {
    const propName = m[1];
    const expression = m[2].trim();
    if (!props[propName]) {
      let resolvedExpression = expression;

      // Trace variable name back to declaration if it is a simple identifier
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expression)) {
        const declRegex = new RegExp(
          `(?:const|let|var)\\s+${expression}\\s*=\\s*([^;\\n]+)`,
        );
        const declMatch = src.match(declRegex);
        if (declMatch) {
          resolvedExpression = declMatch[1].trim();
        }
      }

      const phpVal = translateExpressionToPhp(resolvedExpression, propName);
      if (phpVal) {
        props[propName] = phpVal;
      }
    }
  }

  // Extract and compile inline schema if present
  if (attribsStr.includes('schema=')) {
    const rawSchema = extractBalancedJsxExpression(src, 'schema');
    if (rawSchema) {
      const compiledSchema = compileSchemaObject(rawSchema, src);
      if (compiledSchema) {
        props['schema'] = compiledSchema;
      }
    }
  }

  return props;
}

function buildHeadHtml(
  base: Record<string, string>,
  override: Record<string, string> = {},
): string {
  // Merge: per-page overrides win over layout defaults
  const p = { ...base, ...override };

  const {
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    twitterCreator,
    canonical,
  } = p;

  const tags: string[] = [];

  if (title && !title.includes('FORGEWP')) tags.push(`<title>${title}</title>`);
  if (description)
    tags.push(`<meta name="description" content="${description}">`);
  if (keywords) tags.push(`<meta name="keywords" content="${keywords}">`);
  if (canonical) tags.push(`<link rel="canonical" href="${canonical}">`);

  // Open Graph
  tags.push(`<meta property="og:type" content="${ogType}">`);
  const ogTitleVal = ogTitle || title;
  if (ogTitleVal && !ogTitleVal.includes('FORGEWP')) {
    tags.push(`<meta property="og:title" content="${ogTitleVal}">`);
  }
  const ogDescVal = ogDescription || description;
  if (ogDescVal)
    tags.push(`<meta property="og:description" content="${ogDescVal}">`);
  if (ogImage) tags.push(`<meta property="og:image" content="${ogImage}">`);

  // Twitter
  tags.push(`<meta name="twitter:card" content="${twitterCard}">`);
  if (ogTitleVal && !ogTitleVal.includes('FORGEWP')) {
    tags.push(`<meta name="twitter:title" content="${ogTitleVal}">`);
  }
  if (ogDescVal)
    tags.push(`<meta name="twitter:description" content="${ogDescVal}">`);
  if (twitterCreator)
    tags.push(`<meta name="twitter:creator" content="${twitterCreator}">`);
  if (p.schema) {
    tags.push(`<script type="application/ld+json">\n${p.schema}\n</script>`);
  }

  return tags.join('\n');
}

// ── Render header / footer fragments ─────────────────────────────────────────
let headerHtml = '';
let footerHtml = '';

const hasLayoutsArchitecture =
  existsSync(path.join(themeRoot, 'src', 'app', 'layouts')) ||
  existsSync(layoutPath);

if (hasLayoutsArchitecture) {
  // 1. In modern layout-driven projects, the default layout is the single source of truth
  try {
    const DefaultLayoutComp = await resolveLayoutComponent();
    if (DefaultLayoutComp) {
      const layoutMarkup = renderToStaticMarkup(
        wrapWithRootProviders(
          React.createElement('forgewp-slot-content'),
          DefaultLayoutComp,
        ),
      );
      const slotMatch = layoutMarkup.match(
        /([\s\S]*?)<forgewp-slot-content\s*(?:\/>|>[\s\S]*?<\/forgewp-slot-content>)([\s\S]*)/i,
      );
      if (slotMatch) {
        headerHtml = slotMatch[1];
        footerHtml = slotMatch[2];
        if (headerHtml.trim() || footerHtml.trim()) {
          console.warn(
            `[ForgeWP Compiler] Extracted header and footer shells from layout.`,
          );
        }
      }
    }
  } catch (e: any) {
    console.warn(
      `[ForgeWP Compiler] Layout slot extraction error: ${e.message}`,
    );
  }
} else {
  // 2. Legacy fallback ONLY for older projects with no src/app/layouts or src/app/layout.tsx
  let headerFile = '';
  let headerCompName = '';

  if (themeConfig.headerPath) {
    const absolutePath = path.isAbsolute(themeConfig.headerPath)
      ? themeConfig.headerPath
      : path.join(themeRoot, themeConfig.headerPath);
    if (existsSync(absolutePath)) {
      headerFile = absolutePath;
      headerCompName = path.basename(absolutePath, path.extname(absolutePath));
    }
  }

  if (!headerFile) {
    const headerFallbacks = [
      'src/components/SiteHeader.tsx',
      'src/components/Header.tsx',
      'src/components/Navbar.tsx',
      'src/components/NavBar.tsx',
      'src/components/Navigation.tsx',
      'src/components/layout/header.tsx',
      'src/components/layout/Header.tsx',
      'src/components/layout/navbar.tsx',
      'src/components/layout/Navbar.tsx',
      'src/components/layout/navigation.tsx',
      'src/components/layout/Navigation.tsx',
    ];
    for (const relPath of headerFallbacks) {
      const p = path.join(themeRoot, relPath);
      if (existsSync(p)) {
        headerFile = p;
        headerCompName = path.basename(p, path.extname(p));
        break;
      }
    }
  }

  if (headerFile) {
    try {
      const headerUrl = pathToFileURL(headerFile).href;
      const module = await import(headerUrl);
      const HeaderComponent =
        module[headerCompName] ||
        module.default ||
        Object.values(module).find((v) => typeof v === 'function');
      if (!HeaderComponent) {
        throw new Error(`${headerCompName} component not found in export.`);
      }
      headerHtml = renderToStaticMarkup(React.createElement(HeaderComponent));
    } catch (err: any) {
      console.error(
        `\n[ForgeWP Compiler Error] Failed to load or render the Header component (${headerFile}).`,
      );
      console.error(`Error details: ${err.stack || err.message || err}\n`);
      process.exit(1);
    }
  } else {
    console.warn(
      'No separate Header component found, skipping separate header render',
    );
  }

  let footerFile = '';
  let footerCompName = '';

  if (themeConfig.footerPath) {
    const absolutePath = path.isAbsolute(themeConfig.footerPath)
      ? themeConfig.footerPath
      : path.join(themeRoot, themeConfig.footerPath);
    if (existsSync(absolutePath)) {
      footerFile = absolutePath;
      footerCompName = path.basename(absolutePath, path.extname(absolutePath));
    }
  }

  if (!footerFile) {
    const footerFallbacks = [
      'src/components/SiteFooter.tsx',
      'src/components/Footer.tsx',
      'src/components/layout/footer.tsx',
      'src/components/layout/Footer.tsx',
    ];
    for (const relPath of footerFallbacks) {
      const p = path.join(themeRoot, relPath);
      if (existsSync(p)) {
        footerFile = p;
        footerCompName = path.basename(p, path.extname(p));
        break;
      }
    }
  }

  if (footerFile) {
    try {
      const footerUrl = pathToFileURL(footerFile).href;
      const module = await import(footerUrl);
      const pascalFooter =
        footerCompName.charAt(0).toUpperCase() + footerCompName.slice(1);
      const FooterComponent =
        module[footerCompName] ||
        module[pascalFooter] ||
        module.default ||
        Object.values(module).find((v) => typeof v === 'function');
      if (!FooterComponent) {
        throw new Error(`${footerCompName} component not found in export.`);
      }
      footerHtml = renderToStaticMarkup(React.createElement(FooterComponent));
    } catch (err: any) {
      console.error(
        `\n[ForgeWP Compiler Error] Failed to load or render the Footer component (${footerFile}).`,
      );
      console.error(`Error details: ${err.stack || err.message || err}\n`);
      process.exit(1);
    }
  } else {
    console.warn(
      'No separate Footer component found, skipping separate footer render',
    );
  }
}

// ── Render pages ──────────────────────────────────────────────────────────────
const appHtml = renderPage(
  App,
  path.join(themeRoot, 'src', 'app', 'page.tsx'),
  await resolveLayoutComponent('default'),
);
let layoutExtraHeadTags = '';
const cleanAppHtml = appHtml.replace(
  /<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs,
  (match, childrenHtml) => {
    layoutExtraHeadTags += '\n' + childrenHtml;
    return '';
  },
);

// ── Compile Dynamic WordPress Template Hierarchy ──────────────────────────────
const layoutSeo = extractSeoPropsFromSource(layoutPath);
let headHtml = buildHeadHtml(layoutSeo);
const outDir = path.join(themeRoot, '.forgewp');
mkdirSync(outDir, { recursive: true });
if (existsSync(outDir)) {
  const existingFiles = readdirSync(outDir);
  for (const f of existingFiles) {
    if (f.startsWith('template-') && f.endsWith('.html')) {
      try {
        unlinkSync(path.join(outDir, f));
      } catch {}
    }
  }
}

const appDir = path.join(themeRoot, 'src', 'app');
if (existsSync(appDir)) {
  const { readdirSync } = require('node:fs');
  const files = readdirSync(appDir);
  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const name = file.replace('.tsx', '');
      const isWpTemplate =
        name === 'single' ||
        name === 'archive' ||
        name === '404' ||
        name === 'taxonomy' ||
        name.startsWith('single-') ||
        name.startsWith('taxonomy-') ||
        name.startsWith('archive-');

      if (isWpTemplate) {
        const filePath = path.join(appDir, file);
        console.warn(
          `[ForgeWP Compiler] Attempting to compile template: ${file}`,
        );
        try {
          const module = await import(pathToFileURL(filePath).href);
          const TemplateComponent = module.default;
          if (TemplateComponent) {
            globalThis.__forgewpSsrQueries = {};
            let html = '';
            if (name === '404') {
              let pageEl = React.createElement(TemplateComponent);
              if (isComponentInteractive(filePath)) {
                const rootInfo = getComponentRootClassName(filePath);
                const wrapperProps: Record<string, any> = {
                  'data-forgewp-auto-island': '404',
                  style: { display: 'contents' },
                };
                if (rootInfo.resolvable && rootInfo.className) {
                  wrapperProps.className = rootInfo.className;
                }
                pageEl = React.createElement('div', wrapperProps, pageEl);
              }
              html = renderToStaticMarkup(pageEl);
            } else {
              html = renderPage(TemplateComponent, filePath);
            }

            const ssrState = globalThis.__forgewpSsrQueries || {};
            let stateScript = '';
            if (Object.keys(ssrState).length > 0) {
              stateScript = `\n<script id="forgewp-initial-state" type="application/json">${JSON.stringify({ queries: ssrState })}</script>`;
            }

            let extraHeadTags = '';
            const cleanHtml = html.replace(
              /<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs,
              (match, childrenHtml) => {
                extraHeadTags += '\n' + childrenHtml;
                return '';
              },
            );

            const finalHtml = cleanHtml + stateScript;
            writeFileSync(path.join(outDir, `${name}.html`), finalHtml, 'utf8');
            console.warn(`[ForgeWP Compiler] WROTE ${name}.html to ${outDir}`);

            const seoProps = extractSeoPropsFromSource(filePath);
            let customHeadHtml = buildHeadHtml(layoutSeo, seoProps);
            if (extraHeadTags) {
              customHeadHtml += '\n' + extraHeadTags;
            }
            writeFileSync(
              path.join(outDir, `${name}-head.html`),
              customHeadHtml,
              'utf8',
            );
            console.warn(
              `[ForgeWP Compiler] WROTE ${name}-head.html to ${outDir}`,
            );
          }
        } catch (e: any) {
          console.warn(
            `[ForgeWP Compiler Warning] Failed to render WP template ${file}:`,
            e.message,
          );
        }
      }
    }
  }
}

// ── Write outputs ─────────────────────────────────────────────────────────────

writeFileSync(path.join(outDir, 'header.html'), headerHtml, 'utf8');
writeFileSync(path.join(outDir, 'footer.html'), footerHtml, 'utf8');
writeFileSync(path.join(outDir, 'app.html'), cleanAppHtml, 'utf8');
let finalHeadHtml = headHtml;
if (layoutExtraHeadTags) {
  finalHeadHtml += '\n' + layoutExtraHeadTags;
}
writeFileSync(path.join(outDir, 'head.html'), finalHeadHtml, 'utf8');

// ── Compile Custom Page Templates ──────────────────────────────────────────────
const pagesDir = path.join(themeRoot, 'src', 'app', 'pages');
console.warn(
  'CHECKING PAGES DIR: ' + pagesDir + ' EXISTS: ' + existsSync(pagesDir),
);
if (existsSync(pagesDir)) {
  const { readdirSync } = require('node:fs');
  const pages = readdirSync(pagesDir).filter(
    (f) => f.endsWith('.tsx') && !/^placeholder\.tsx$/i.test(f),
  );

  for (const pageFile of pages) {
    const pagePath = path.join(pagesDir, pageFile);
    console.warn(`Attempting to compile template: ${pageFile}`);
    try {
      const module = await import(pathToFileURL(pagePath).href);
      const CustomPage = module.default || Object.values(module)[0];
      if (CustomPage) {
        globalThis.__forgewpSsrQueries = {};
        const pageConfig =
          module.pageConfig && typeof module.pageConfig === 'object'
            ? module.pageConfig
            : {};
        const pageName = pageFile.replace('.tsx', '');
        const slug = pageName
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();

        const isPostTypeSingle =
          slug === 'product' ||
          slug.startsWith('single-') ||
          Boolean(pageConfig && pageConfig.postType);

        const singleSlug =
          pageConfig?.postType ||
          (slug.startsWith('single-') ? slug.replace(/^single-/, '') : slug);

        // Dynamically discover a representative sample item for this post type
        // so SSR renders a rich, complete preview skeleton instead of a not-found fallback
        let sampleSlug = '';
        let samplePost: any = null;
        if (isPostTypeSingle) {
          try {
            if (singleSlug === 'product') {
              const products = loadProductsData(themeRoot);
              if (Array.isArray(products) && products.length > 0) {
                samplePost = products[0];
                sampleSlug = products[0].slug || '';
              }
            }
            if (!sampleSlug) {
              const mockData = loadMockData(themeRoot);
              if (
                mockData &&
                Array.isArray(mockData[singleSlug]) &&
                mockData[singleSlug].length > 0
              ) {
                samplePost = mockData[singleSlug][0];
                sampleSlug = mockData[singleSlug][0].slug || '';
              }
            }
          } catch {}
        }

        if (sampleSlug) {
          if (globalThis.window && globalThis.window.location) {
            (globalThis.window.location as any).pathname =
              `/${singleSlug}/${sampleSlug}`;
          }
          if (globalThis.location) {
            (globalThis.location as any).pathname =
              `/${singleSlug}/${sampleSlug}`;
          }
          (globalThis.window as any).forgeWpHydration = {
            post: samplePost
              ? { id: samplePost.id || 1, slug: sampleSlug, ...samplePost }
              : { id: 1, slug: sampleSlug },
          };
        } else {
          if (globalThis.window && globalThis.window.location) {
            (globalThis.window.location as any).pathname = `/${slug}`;
          }
          if (globalThis.location) {
            (globalThis.location as any).pathname = `/${slug}`;
          }
          (globalThis.window as any).forgeWpHydration = undefined;
        }

        const LayoutComponent = await resolveLayoutComponent(pageConfig.layout);
        const customHtml = renderPage(CustomPage, pagePath, LayoutComponent);
        const ssrState = globalThis.__forgewpSsrQueries || {};
        let stateScript = '';
        if (Object.keys(ssrState).length > 0) {
          stateScript = `\n<script id="forgewp-initial-state" type="application/json">${JSON.stringify({ queries: ssrState })}</script>`;
        }

        let customExtraHeadTags = '';
        const cleanCustomHtml = customHtml.replace(
          /<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs,
          (match, childrenHtml) => {
            customExtraHeadTags += '\n' + childrenHtml;
            return '';
          },
        );

        let finalHtml = cleanCustomHtml + stateScript;
        if (pageConfig.protected) {
          const allowedAttr = pageConfig.allowed
            ? ` allowed="${pageConfig.allowed}"`
            : '';
          const redirectAttr = pageConfig.redirect
            ? ` redirect="${pageConfig.redirect}"`
            : '';
          finalHtml =
            `<forgewp-require-auth${allowedAttr}${redirectAttr}></forgewp-require-auth>` +
            finalHtml;
        }

        const pageConfigAttrs: string[] = [];
        if (pageConfig.header !== undefined)
          pageConfigAttrs.push(`header="${pageConfig.header}"`);
        if (pageConfig.footer !== undefined)
          pageConfigAttrs.push(`footer="${pageConfig.footer}"`);
        if (pageConfig.layout !== undefined)
          pageConfigAttrs.push(`layout="${pageConfig.layout}"`);

        if (pageConfigAttrs.length > 0) {
          finalHtml =
            `<forgewp-page-config ${pageConfigAttrs.join(' ')}></forgewp-page-config>` +
            finalHtml;
        }

        writeFileSync(
          path.join(outDir, `template-${slug}.html`),
          finalHtml,
          'utf8',
        );
        console.warn(`WROTE template-${slug}.html to ${outDir}`);

        const customSeo = extractSeoPropsFromSource(pagePath);
        let customHeadHtml = buildHeadHtml(layoutSeo, customSeo);
        if (customExtraHeadTags) {
          customHeadHtml += '\n' + customExtraHeadTags;
        }
        writeFileSync(
          path.join(outDir, `template-${slug}-head.html`),
          customHeadHtml,
          'utf8',
        );
        console.warn(`WROTE template-${slug}-head.html to ${outDir}`);

        if (isPostTypeSingle) {
          writeFileSync(
            path.join(outDir, `single-${singleSlug}.html`),
            finalHtml,
            'utf8',
          );
          writeFileSync(
            path.join(outDir, `single-${singleSlug}-head.html`),
            customHeadHtml,
            'utf8',
          );
          console.warn(`WROTE single-${singleSlug}.html to ${outDir}`);
        }
      }
    } catch (e: any) {
      console.warn(`Failed to render custom page ${pageFile}:`, e.message);
    }
  }
}

// ── Compile Declared Routes from routes.tsx ────────────────────────────────────
const routesFile = path.join(themeRoot, 'src', 'app', 'routes.tsx');
if (existsSync(routesFile)) {
  try {
    const routesSource = readFileSync(routesFile, 'utf8');
    const routesModule = await import(pathToFileURL(routesFile).href);
    const AppRoutes =
      routesModule.default ||
      Object.values(routesModule).find((v) => typeof v === 'function');

    let RouterComp: any = null;
    try {
      const forgewpReactPath = require.resolve('@forgewp/react');
      const forgewpReact = await import(pathToFileURL(forgewpReactPath).href);
      RouterComp = forgewpReact.Router || forgewpReact.default?.Router;
    } catch {
      try {
        const forgewpReact = require('@forgewp/react');
        RouterComp = forgewpReact.Router || forgewpReact.default?.Router;
      } catch {}
    }

    if (AppRoutes) {
      const staticRouteSlugs = new Set<string>();
      for (const m of routesSource.matchAll(
        /path\s*=\s*['"]\/([^'"`]+)['"]/g,
      )) {
        const raw = m[1].replace(/^\/+|\/+$/g, '');
        if (raw && !raw.includes(':') && !raw.includes('*')) {
          staticRouteSlugs.add(raw);
        }
      }

      for (const slug of staticRouteSlugs) {
        const templateSlug = slug.replace(/\//g, '-');
        const outTemplateFile = path.join(
          outDir,
          `template-${templateSlug}.html`,
        );
        // If template was already compiled by a dedicated page file, do not overwrite
        if (existsSync(outTemplateFile)) continue;

        // Skip reserved system paths
        const reservedRoots = new Set([
          'product',
          'products',
          'category',
          'categories',
          'search',
          'wp-admin',
          'wp-json',
          'wp-content',
          'wp-includes',
        ]);
        if (reservedRoots.has(slug) || reservedRoots.has(templateSlug))
          continue;

        try {
          globalThis.__forgewpSsrQueries = {};
          if (globalThis.window && globalThis.window.location) {
            (globalThis.window.location as any).pathname = '/' + slug;
          }
          if (globalThis.location) {
            (globalThis.location as any).pathname = '/' + slug;
          }

          let routeElement: any;
          if (RouterComp) {
            routeElement = React.createElement(
              RouterComp,
              { location: '/' + slug },
              React.createElement(AppRoutes),
            );
          } else {
            routeElement = React.createElement(AppRoutes);
          }

          const pageBoundary = React.createElement(
            'forgewp-content-boundary',
            null,
            routeElement,
          );
          const customHtml = renderToStaticMarkup(
            wrapWithRootProviders(pageBoundary, RootLayout),
          );

          const ssrState = globalThis.__forgewpSsrQueries || {};
          let stateScript = '';
          if (Object.keys(ssrState).length > 0) {
            stateScript = `\n<script id="forgewp-initial-state" type="application/json">${JSON.stringify({ queries: ssrState })}</script>`;
          }

          let customExtraHeadTags = '';
          const cleanCustomHtml = customHtml.replace(
            /<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs,
            (match, childrenHtml) => {
              customExtraHeadTags += '\n' + childrenHtml;
              return '';
            },
          );

          const finalHtml = cleanCustomHtml + stateScript;
          writeFileSync(outTemplateFile, finalHtml, 'utf8');
          console.warn(
            `WROTE template-${templateSlug}.html from routes.tsx to ${outDir}`,
          );

          let customHeadHtml = buildHeadHtml(layoutSeo, {});
          if (customExtraHeadTags) {
            customHeadHtml += '\n' + customExtraHeadTags;
          }
          writeFileSync(
            path.join(outDir, `template-${templateSlug}-head.html`),
            customHeadHtml,
            'utf8',
          );
        } catch (routeErr: any) {
          console.warn(
            `Failed to render route /${slug} from routes.tsx:`,
            routeErr.message,
          );
        }
      }
    }
  } catch (e: any) {
    console.warn(`Failed to load routes.tsx for route SSR:`, e.message);
  }
}

process.stdout.write(outDir);
