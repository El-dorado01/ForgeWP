import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire, register } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "asset-loader.js")).href);

const themeRoot = process.argv[2];

if (!themeRoot) {
  console.error("Usage: render-theme.mts <theme-root>");
  process.exit(1);
}

// Use the theme's own node_modules for ALL packages (React 19)
const require = createRequire(path.join(themeRoot, "package.json"));
const React = require("react");
globalThis.React = React; // Polyfill for classic JSX transform in Node.js

// Resilient browser globals polyfills for Node SSR/compile-time rendering
if (typeof globalThis.window === "undefined") {
  const mockLocation = {
    pathname: "/",
    search: "",
    hash: "",
    href: "http://localhost/",
    origin: "http://localhost",
    assign: () => {},
    replace: () => {},
    reload: () => {}
  };
  globalThis.window = {
    location: mockLocation,
    navigator: { userAgent: "Node" },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    _forgeWpCompileTime: true,
  } as any;
  globalThis.location = mockLocation as any;
  globalThis.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  } as any;
}

const { renderToStaticMarkup } = require("react-dom/server");

const appUrl = pathToFileURL(path.join(themeRoot, "src", "app", "page.tsx")).href;
const headerPath = path.join(themeRoot, "src", "components", "SiteHeader.tsx");
const headerUrl = pathToFileURL(headerPath).href;
const footerUrl = pathToFileURL(path.join(themeRoot, "src", "components", "SiteFooter.tsx")).href;
const layoutUrl = pathToFileURL(path.join(themeRoot, "src", "app", "layout.tsx")).href;
const layoutPath = path.join(themeRoot, "src", "app", "layout.tsx");

// ── Load pages ────────────────────────────────────────────────────────────────
let App: any;
try {
  const module = await import(appUrl);
  App = module.default;
  if (!App) {
    throw new Error("Page component lacks a default export.");
  }
} catch (err: any) {
  console.error(`\n[ForgeWP Compiler Error] Failed to load the main Page component (src/app/page.tsx).`);
  console.error(`Check for syntax errors, incorrect imports, or invalid references inside your page component.`);
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
      throw new Error("Root layout component lacks a default export.");
    }
  } catch (err: any) {
    console.error(`\n[ForgeWP Compiler Error] Failed to load the Root Layout component (src/app/layout.tsx).`);
    console.error(`Check for syntax errors, incorrect imports, or invalid references inside your layout component.`);
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
} else {
  console.warn("RootLayout (src/app/layout.tsx) not found, using Fragment fallback");
}

// ── Render a page inside RootLayout ──────────────────────────────────────────
function renderPage(PageComponent: any): string {
  try {
    return renderToStaticMarkup(
      React.createElement(RootLayout, null, React.createElement(PageComponent))
    );
  } catch (err: any) {
    console.error(`\n[ForgeWP Compiler Error] Server-Side Rendering (SSR) failed for Page Component.`);
    console.error(`This typically happens if you use browser-only globals (like 'window', 'document', 'localStorage') at render-time, or if a component throws during execution.`);
    console.error(`Ensure browser-specific logic is placed inside useEffect() or is executed only in the client.`);
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
}

let textDomain = "forgewp";
try {
  const wpConfigPath = path.join(themeRoot, "wp.config.ts");
  if (existsSync(wpConfigPath)) {
    const configContent = readFileSync(wpConfigPath, "utf8");
    const domainMatch = configContent.match(/textDomain\s*:\s*['"]([^'"]+)['"]/);
    if (domainMatch) {
      textDomain = domainMatch[1];
    }
  }
} catch (e) {}

function translateExpressionToPhp(expression: string, propName: string): string {
  expression = expression.trim();

  // 1. Check for useWpTitle()
  if (expression.includes("useWpTitle(")) {
    return `<?php echo esc_attr(get_the_title()); ?>`;
  }
  // 2. Check for useWpExcerpt()
  if (expression.includes("useWpExcerpt(")) {
    return `<?php echo esc_attr(get_the_excerpt()); ?>`;
  }
  // 3. Check for useWpFeaturedImage()
  if (expression.includes("useWpFeaturedImage(")) {
    return `<?php echo esc_url(get_the_post_thumbnail_url(get_the_ID(), 'full')); ?>`;
  }
  // 4. Check for useWpPermalink()
  if (expression.includes("useWpPermalink(")) {
    return `<?php echo esc_url(get_permalink()); ?>`;
  }
  // 5. Check for useWpCustomField / useWpField / useWpMeta
  const metaMatch = expression.match(/useWp(?:CustomField|Field|Meta)\s*\(\s*['"]([^'"]+)['"]/);
  if (metaMatch) {
    const key = metaMatch[1];
    const isUrl = propName === "canonical" || propName === "ogImage" || key.includes("url") || key.includes("image") || key.includes("website");
    const escFn = isUrl ? "esc_url" : "esc_attr";
    return `<?php echo ${escFn}(get_post_meta(get_the_ID(), '${key}', true)); ?>`;
  }
  // 6. Check for useWpAuthor()
  if (expression.includes("useWpAuthor(")) {
    return `<?php echo esc_attr(get_the_author()); ?>`;
  }
  // 7. Check for useWpDate()
  if (expression.includes("useWpDate(")) {
    return `<?php echo esc_attr(get_the_date()); ?>`;
  }
  // 8. Check for useWpOption()
  const optionMatch = expression.match(/useWpOption\s*\(\s*['"]([^'"]+)['"]/);
  if (optionMatch) {
    const key = optionMatch[1];
    return `<?php echo esc_attr(get_option('${key}', '')); ?>`;
  }
  // 9. Check for useWpThemeMod()
  const themeModMatch = expression.match(/useWpThemeMod\s*\(\s*['"]([^'"]+)['"]/);
  if (themeModMatch) {
    const key = themeModMatch[1];
    return `<?php echo esc_attr(get_theme_mod('${key}', '')); ?>`;
  }
  // 10. Check for useWpPageLink
  const pageLinkMatch = expression.match(/useWpPageLink\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
  if (pageLinkMatch) {
    const templateName = pageLinkMatch[1];
    const fallbackUrl = pageLinkMatch[2];
    return `<?php $matched = get_pages(array('meta_key' => '_wp_page_template', 'meta_value' => 'page-${templateName.replace(/-page$/, "")}.php', 'number' => 1)); echo esc_url(!empty($matched) ? get_permalink($matched[0]->ID) : home_url('${fallbackUrl}')); ?>`;
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
  return "";
}

function extractBalancedJsxExpression(src: string, propName: string): string {
  const marker = `${propName}={`;
  const index = src.indexOf(marker);
  if (index === -1) return "";
  let braces = 1;
  let start = index + marker.length;
  let i = start;
  while (braces > 0 && i < src.length) {
    if (src[i] === "{") braces++;
    else if (src[i] === "}") braces--;
    i++;
  }
  return src.slice(start, i - 1).trim();
}

function compileSchemaObject(schemaExpr: string, fileSrc: string): string {
  return schemaExpr.replace(/("[\w@]+"|[\w@]+)\s*:\s*([^,\n}]+)/g, (match, key, valStr) => {
    let val = valStr.trim();
    if (/^["']([^"']*)["']$/.test(val)) {
      return `${key}: ${val}`;
    }
    if (/^(true|false|[0-9.]+)$/i.test(val)) {
      return `${key}: ${val}`;
    }
    let resolved = val;
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val)) {
      const declRegex = new RegExp(`(?:const|let|var)\\s+${val}\\s*=\\s*([^;\\n]+)`);
      const declMatch = fileSrc.match(declRegex);
      if (declMatch) {
        resolved = declMatch[1].trim();
      }
    }
    const phpVal = translateExpressionToPhp(resolved, "");
    if (phpVal) {
      return `${key}: "${phpVal}"`;
    }
    return `${key}: ${val}`;
  });
}

// ── SEO extraction from source files (React 19 SSR-safe) ─────────────────────
// react-helmet-async v3 disabled server-side context for React 19 —
// HelmetProvider is a Fragment at SSR time so helmetContext.helmet is never set.
// Instead we parse <SEO .../> props directly from the source TSX file.

function extractSeoPropsFromSource(filePath: string): Record<string, string> {
  if (!filePath || !existsSync(filePath)) return {};

  let src = readFileSync(filePath, "utf8");

  // Strip JSX block comments so we don't match <SEO /> mentions inside them
  src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

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
      for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
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
  while ((m = sqPattern.exec(attribsStr)) !== null) if (!props[m[1]]) props[m[1]] = m[2];

  // JSX string expressions: prop={"value"} or prop={'value'}
  const jsxPattern = /(\w+)\s*=\s*\{["']([^"']*)["']\}/g;
  while ((m = jsxPattern.exec(attribsStr)) !== null) if (!props[m[1]]) props[m[1]] = m[2];

  // JSX brace expressions: prop={expression}
  const exprPattern = /(\w+)\s*=\s*\{([^}]*)\}/g;
  while ((m = exprPattern.exec(attribsStr)) !== null) {
    const propName = m[1];
    const expression = m[2].trim();
    if (!props[propName]) {
      let resolvedExpression = expression;
      
      // Trace variable name back to declaration if it is a simple identifier
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expression)) {
        const declRegex = new RegExp(`(?:const|let|var)\\s+${expression}\\s*=\\s*([^;\\n]+)`);
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
  if (attribsStr.includes("schema=")) {
    const rawSchema = extractBalancedJsxExpression(src, "schema");
    if (rawSchema) {
      const compiledSchema = compileSchemaObject(rawSchema, src);
      if (compiledSchema) {
        props["schema"] = compiledSchema;
      }
    }
  }

  return props;
}

function buildHeadHtml(
  base: Record<string, string>,
  override: Record<string, string> = {}
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
    ogType = "website",
    twitterCard = "summary_large_image",
    twitterCreator,
    canonical,
  } = p;

  const tags: string[] = [];

  if (title && !title.includes("FORGEWP")) tags.push(`<title>${title}</title>`);
  if (description) tags.push(`<meta name="description" content="${description}">`);
  if (keywords) tags.push(`<meta name="keywords" content="${keywords}">`);
  if (canonical) tags.push(`<link rel="canonical" href="${canonical}">`);

  // Open Graph
  tags.push(`<meta property="og:type" content="${ogType}">`);
  const ogTitleVal = ogTitle || title;
  if (ogTitleVal && !ogTitleVal.includes("FORGEWP")) {
    tags.push(`<meta property="og:title" content="${ogTitleVal}">`);
  }
  const ogDescVal = ogDescription || description;
  if (ogDescVal) tags.push(`<meta property="og:description" content="${ogDescVal}">`);
  if (ogImage) tags.push(`<meta property="og:image" content="${ogImage}">`);

  // Twitter
  tags.push(`<meta name="twitter:card" content="${twitterCard}">`);
  if (ogTitleVal && !ogTitleVal.includes("FORGEWP")) {
    tags.push(`<meta name="twitter:title" content="${ogTitleVal}">`);
  }
  if (ogDescVal) tags.push(`<meta name="twitter:description" content="${ogDescVal}">`);
  if (twitterCreator) tags.push(`<meta name="twitter:creator" content="${twitterCreator}">`);
  if (p.schema) {
    tags.push(`<script type="application/ld+json">\n${p.schema}\n</script>`);
  }

  return tags.join("\n");
}

// ── Render header / footer fragments ─────────────────────────────────────────
const footerPath = path.join(themeRoot, "src", "components", "SiteFooter.tsx");

let headerHtml = "";
if (existsSync(headerPath)) {
  try {
    const module = await import(headerUrl);
    const SiteHeader = module.SiteHeader || module.default;
    if (!SiteHeader) {
      throw new Error("SiteHeader component not found in export (expects named export 'SiteHeader' or default export).");
    }
    headerHtml = renderToStaticMarkup(React.createElement(SiteHeader));
  } catch (err: any) {
    console.error(`\n[ForgeWP Compiler Error] Failed to load or render the Site Header component (src/components/SiteHeader.tsx).`);
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
} else {
  console.warn("SiteHeader (src/components/SiteHeader.tsx) not found, skipping separate render");
}

let footerHtml = "";
if (existsSync(footerPath)) {
  try {
    const module = await import(footerUrl);
    const SiteFooter = module.SiteFooter || module.default;
    if (!SiteFooter) {
      throw new Error("SiteFooter component not found in export (expects named export 'SiteFooter' or default export).");
    }
    footerHtml = renderToStaticMarkup(React.createElement(SiteFooter));
  } catch (err: any) {
    console.error(`\n[ForgeWP Compiler Error] Failed to load or render the Site Footer component (src/components/SiteFooter.tsx).`);
    console.error(`Error details: ${err.stack || err.message || err}\n`);
    process.exit(1);
  }
} else {
  console.warn("SiteFooter (src/components/SiteFooter.tsx) not found, skipping separate render");
}

// ── Render pages ──────────────────────────────────────────────────────────────
const appHtml = renderPage(App);
let layoutExtraHeadTags = "";
const cleanAppHtml = appHtml.replace(/<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs, (match, childrenHtml) => {
  layoutExtraHeadTags += "\n" + childrenHtml;
  return "";
});

// ── Compile Dynamic WordPress Template Hierarchy ──────────────────────────────
const layoutSeo = extractSeoPropsFromSource(layoutPath);
let headHtml = buildHeadHtml(layoutSeo);
const outDir = path.join(themeRoot, ".forgewp");
mkdirSync(outDir, { recursive: true });

const appDir = path.join(themeRoot, "src", "app");
if (existsSync(appDir)) {
  const { readdirSync } = require("node:fs");
  const files = readdirSync(appDir);
  for (const file of files) {
    if (file.endsWith(".tsx")) {
      const name = file.replace(".tsx", "");
      const isWpTemplate = 
        name === "single" || 
        name === "archive" || 
        name === "404" || 
        name === "taxonomy" ||
        name.startsWith("single-") ||
        name.startsWith("taxonomy-") ||
        name.startsWith("archive-");
      
      if (isWpTemplate) {
        const filePath = path.join(appDir, file);
        console.warn(`[ForgeWP Compiler] Attempting to compile template: ${file}`);
        try {
          const module = await import(pathToFileURL(filePath).href);
          const TemplateComponent = module.default;
          if (TemplateComponent) {
            globalThis.__forgewpSsrQueries = {};
            const html = name === "404"
              ? renderToStaticMarkup(React.createElement(TemplateComponent))
              : renderPage(TemplateComponent);
            
            const ssrState = globalThis.__forgewpSsrQueries || {};
            let stateScript = "";
            if (Object.keys(ssrState).length > 0) {
              stateScript = `\n<script id="forgewp-initial-state" type="application/json">${JSON.stringify({ queries: ssrState })}</script>`;
            }

            let extraHeadTags = "";
            const cleanHtml = html.replace(/<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs, (match, childrenHtml) => {
              extraHeadTags += "\n" + childrenHtml;
              return "";
            });
            
            const finalHtml = cleanHtml + stateScript;
            writeFileSync(path.join(outDir, `${name}.html`), finalHtml, "utf8");
            console.warn(`[ForgeWP Compiler] WROTE ${name}.html to ${outDir}`);
            
            const seoProps = extractSeoPropsFromSource(filePath);
            let customHeadHtml = buildHeadHtml(layoutSeo, seoProps);
            if (extraHeadTags) {
              customHeadHtml += "\n" + extraHeadTags;
            }
            writeFileSync(path.join(outDir, `${name}-head.html`), customHeadHtml, "utf8");
            console.warn(`[ForgeWP Compiler] WROTE ${name}-head.html to ${outDir}`);
          }
        } catch (e: any) {
          console.warn(`[ForgeWP Compiler Warning] Failed to render WP template ${file}:`, e.message);
        }
      }
    }
  }
}

// ── Write outputs ─────────────────────────────────────────────────────────────


writeFileSync(path.join(outDir, "header.html"), headerHtml, "utf8");
writeFileSync(path.join(outDir, "footer.html"), footerHtml, "utf8");
writeFileSync(path.join(outDir, "app.html"), cleanAppHtml, "utf8");
let finalHeadHtml = headHtml;
if (layoutExtraHeadTags) {
  finalHeadHtml += "\n" + layoutExtraHeadTags;
}
writeFileSync(path.join(outDir, "head.html"), finalHeadHtml, "utf8");


// ── Compile Custom Page Templates ──────────────────────────────────────────────
const pagesDir = path.join(themeRoot, "src", "app", "pages");
console.warn("CHECKING PAGES DIR: " + pagesDir + " EXISTS: " + existsSync(pagesDir));
if (existsSync(pagesDir)) {
  const { readdirSync } = require("node:fs");
  const pages = readdirSync(pagesDir).filter(f => f.endsWith(".tsx"));
  
  for (const pageFile of pages) {
    const pagePath = path.join(pagesDir, pageFile);
    console.warn(`Attempting to compile template: ${pageFile}`);
    try {
      const module = await import(pathToFileURL(pagePath).href);
      const CustomPage = module.default || Object.values(module)[0];
      if (CustomPage) {
        globalThis.__forgewpSsrQueries = {};
        const customHtml = renderPage(CustomPage);
        const ssrState = globalThis.__forgewpSsrQueries || {};
        let stateScript = "";
        if (Object.keys(ssrState).length > 0) {
          stateScript = `\n<script id="forgewp-initial-state" type="application/json">${JSON.stringify({ queries: ssrState })}</script>`;
        }

        let customExtraHeadTags = "";
        const cleanCustomHtml = customHtml.replace(/<forgewp-head\b[^>]*>(.*?)<\/forgewp-head>/gs, (match, childrenHtml) => {
          customExtraHeadTags += "\n" + childrenHtml;
          return "";
        });
        const pageName = pageFile.replace(".tsx", "");
        const slug = pageName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

        const finalHtml = cleanCustomHtml + stateScript;
        writeFileSync(path.join(outDir, `template-${slug}.html`), finalHtml, "utf8");
        console.warn(`WROTE template-${slug}.html to ${outDir}`);
        
        const customSeo = extractSeoPropsFromSource(pagePath);
        let customHeadHtml = buildHeadHtml(layoutSeo, customSeo);
        if (customExtraHeadTags) {
          customHeadHtml += "\n" + customExtraHeadTags;
        }
        writeFileSync(path.join(outDir, `template-${slug}-head.html`), customHeadHtml, "utf8");
        console.warn(`WROTE template-${slug}-head.html to ${outDir}`);
      }
    } catch (e) {
      console.warn(`Failed to render custom page ${pageFile}:`, e.message);
    }
  }
}

process.stdout.write(outDir);
