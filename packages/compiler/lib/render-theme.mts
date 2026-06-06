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

// ── SEO extraction from source files (React 19 SSR-safe) ─────────────────────
// react-helmet-async v3 disabled server-side context for React 19 —
// HelmetProvider is a Fragment at SSR time so helmetContext.helmet is never set.
// Instead we parse <SEO .../> props directly from the source TSX file.

function extractSeoPropsFromSource(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  let src = readFileSync(filePath, "utf8");

  // Strip JSX block comments so we don't match <SEO /> mentions inside them
  src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  // Find the first <SEO ... /> or <WpHead ... /> (multiline, s flag)
  const seoMatch = src.match(/<(?:SEO|WpHead)\b([^>]*?)(?:\/>|>)/s);
  if (!seoMatch) return {};

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
  if (ogImage) tags.push(`<meta name="twitter:image" content="${ogImage}">`);
  if (twitterCreator) tags.push(`<meta name="twitter:creator" content="${twitterCreator}">`);

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

// ── Compile Dynamic WordPress Template Hierarchy ──────────────────────────────
const layoutSeo = extractSeoPropsFromSource(layoutPath);
const headHtml = buildHeadHtml(layoutSeo);
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
            const html = name === "404"
              ? renderToStaticMarkup(React.createElement(TemplateComponent))
              : renderPage(TemplateComponent);
            
            writeFileSync(path.join(outDir, `${name}.html`), html, "utf8");
            console.warn(`[ForgeWP Compiler] WROTE ${name}.html to ${outDir}`);
            
            const seoProps = extractSeoPropsFromSource(filePath);
            const customHeadHtml = buildHeadHtml(layoutSeo, seoProps);
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
writeFileSync(path.join(outDir, "app.html"), appHtml, "utf8");
writeFileSync(path.join(outDir, "head.html"), headHtml, "utf8");


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
        const customHtml = renderPage(CustomPage);
        const pageName = pageFile.replace(".tsx", "");
        const slug = pageName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        writeFileSync(path.join(outDir, `template-${slug}.html`), customHtml, "utf8");
        console.warn(`WROTE template-${slug}.html to ${outDir}`);
        
        const customSeo = extractSeoPropsFromSource(pagePath);
        const customHeadHtml = buildHeadHtml(layoutSeo, customSeo);
        writeFileSync(path.join(outDir, `template-${slug}-head.html`), customHeadHtml, "utf8");
        console.warn(`WROTE template-${slug}-head.html to ${outDir}`);
      }
    } catch (e) {
      console.warn(`Failed to render custom page ${pageFile}:`, e.message);
    }
  }
}

process.stdout.write(outDir);
