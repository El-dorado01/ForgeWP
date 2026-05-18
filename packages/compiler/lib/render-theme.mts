import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const themeRoot = process.argv[2];

if (!themeRoot) {
  console.error("Usage: render-theme.mts <theme-root>");
  process.exit(1);
}

// Use the theme's own node_modules for ALL packages (React 19)
const require = createRequire(path.join(themeRoot, "package.json"));
const React = require("react");
globalThis.React = React; // Polyfill for classic JSX transform in Node.js
const { renderToStaticMarkup } = require("react-dom/server");

const appUrl = pathToFileURL(path.join(themeRoot, "src", "app", "page.tsx")).href;
const headerUrl = pathToFileURL(path.join(themeRoot, "src", "components", "SiteHeader.tsx")).href;
const footerUrl = pathToFileURL(path.join(themeRoot, "src", "components", "SiteFooter.tsx")).href;
const layoutUrl = pathToFileURL(path.join(themeRoot, "src", "app", "layout.tsx")).href;
const layoutPath = path.join(themeRoot, "src", "app", "layout.tsx");

// ── Load pages ────────────────────────────────────────────────────────────────
const { default: App } = await import(appUrl);

let RootLayout: (props: any) => any = ({ children }: any) =>
  React.createElement(React.Fragment, null, children);
try {
  const { default: LoadedLayout } = await import(layoutUrl);
  RootLayout = LoadedLayout;
} catch {
  console.warn("RootLayout not found, using Fragment fallback");
}

// ── Render a page inside RootLayout ──────────────────────────────────────────
function renderPage(PageComponent: any): string {
  return renderToStaticMarkup(
    React.createElement(RootLayout, null, React.createElement(PageComponent))
  );
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

  // Find the first <SEO ... /> (multiline, s flag)
  const seoMatch = src.match(/<SEO\b([\s\S]*?)\/>/s);
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
let headerHtml = "";
try {
  const { SiteHeader } = await import(headerUrl);
  headerHtml = renderToStaticMarkup(React.createElement(SiteHeader));
} catch {
  console.warn("SiteHeader not found, skipping separate render");
}

let footerHtml = "";
try {
  const { SiteFooter } = await import(footerUrl);
  footerHtml = renderToStaticMarkup(React.createElement(SiteFooter));
} catch {
  console.warn("SiteFooter not found, skipping separate render");
}

// ── Render pages ──────────────────────────────────────────────────────────────
const appHtml = renderPage(App);

// single.tsx
const singlePath = path.join(themeRoot, "src", "app", "single.tsx");
let singleHtml = "";
if (existsSync(singlePath)) {
  const { default: SinglePage } = await import(pathToFileURL(singlePath).href);
  singleHtml = renderPage(SinglePage);
}

// 404.tsx — rendered bare, no RootLayout (WP 404.php calls get_header/get_footer)
const notFoundPath = path.join(themeRoot, "src", "app", "404.tsx");
let notFoundHtml = "";
if (existsSync(notFoundPath)) {
  const { default: NotFoundPage } = await import(pathToFileURL(notFoundPath).href);
  notFoundHtml = renderToStaticMarkup(React.createElement(NotFoundPage));
}

// archive.tsx
const archivePath = path.join(themeRoot, "src", "app", "archive.tsx");
let archiveHtml = "";
if (existsSync(archivePath)) {
  const { default: ArchivePage } = await import(pathToFileURL(archivePath).href);
  archiveHtml = renderPage(ArchivePage);
}

// ── Extract SEO from source files ─────────────────────────────────────────────
// Global defaults come from layout.tsx <SEO> props.
// Per-page overrides come from the individual page file's <SEO> props.
const layoutSeo = extractSeoPropsFromSource(layoutPath);
const singleSeo = existsSync(singlePath)
  ? extractSeoPropsFromSource(singlePath)
  : {};

// Global head.html (used on all pages that don't have a per-page override)
const headHtml = buildHeadHtml(layoutSeo);

// Per-page head HTML for single.html (merged: layout defaults + single overrides)
const singleHeadHtml = buildHeadHtml(layoutSeo, singleSeo);

// ── Write outputs ─────────────────────────────────────────────────────────────
const outDir = path.join(themeRoot, ".forgewp");
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, "header.html"), headerHtml, "utf8");
writeFileSync(path.join(outDir, "footer.html"), footerHtml, "utf8");
writeFileSync(path.join(outDir, "app.html"), appHtml, "utf8");
writeFileSync(path.join(outDir, "head.html"), headHtml, "utf8");
writeFileSync(path.join(outDir, "single-head.html"), singleHeadHtml, "utf8");

if (singleHtml) writeFileSync(path.join(outDir, "single.html"), singleHtml, "utf8");
if (notFoundHtml) writeFileSync(path.join(outDir, "404.html"), notFoundHtml, "utf8");
if (archiveHtml) writeFileSync(path.join(outDir, "archive.html"), archiveHtml, "utf8");

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
