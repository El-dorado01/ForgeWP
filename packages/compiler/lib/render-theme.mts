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

// ── Render a page to static markup ───────────────────────────────────────────
function renderPage(PageComponent: any): string {
  return renderToStaticMarkup(
    React.createElement(RootLayout, null, React.createElement(PageComponent))
  );
}

// ── Extract SEO props from layout.tsx source (React 19 SSR-safe) ─────────────
// react-helmet-async v3 disabled SSR context for React 19 — HelmetProvider
// is just a Fragment in React 19 mode. We parse props from source instead.

function extractSeoPropsFromSource(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  let src = readFileSync(filePath, "utf8");

  // Strip JSX block comments {/* ... */} so we don't match <SEO /> inside them
  src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  // Find <SEO ... /> — use multiline match (s flag) to capture props across lines
  const seoMatch = src.match(/<SEO\b([\s\S]*?)\/>/s);
  if (!seoMatch) return {};

  const attribsStr = seoMatch[1];
  const props: Record<string, string> = {};

  // Match double-quoted props: propName="value with & and other chars"
  let m: RegExpExecArray | null;
  const dqPattern = /(\w+)\s*=\s*"([^"]*)"/g;
  while ((m = dqPattern.exec(attribsStr)) !== null) {
    props[m[1]] = m[2];
  }

  // Match single-quoted props: propName='value'
  const sqPattern = /(\w+)\s*=\s*'([^']*)'/g;
  while ((m = sqPattern.exec(attribsStr)) !== null) {
    if (!props[m[1]]) props[m[1]] = m[2];
  }

  // Match JSX string expression props: propName={"value"} or propName={'value'}
  const jsxPattern = /(\w+)\s*=\s*\{["']([^"']*)["']\}/g;
  while ((m = jsxPattern.exec(attribsStr)) !== null) {
    if (!props[m[1]]) props[m[1]] = m[2];
  }

  return props;
}

function buildHeadHtml(seoProps: Record<string, string>): string {
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
  } = seoProps;

  const tags: string[] = [];

  // Primary — only add a static title if it's a real value (not WP token)
  if (title && !title.includes("FORGEWP")) {
    tags.push(`<title>${title}</title>`);
  }
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

// ── Render header and footer ──────────────────────────────────────────────────
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

const singlePath = path.join(themeRoot, "src", "app", "single.tsx");
let singleHtml = "";
if (existsSync(singlePath)) {
  const { default: SinglePage } = await import(pathToFileURL(singlePath).href);
  singleHtml = renderPage(SinglePage);
}

const notFoundPath = path.join(themeRoot, "src", "app", "404.tsx");
let notFoundHtml = "";
if (existsSync(notFoundPath)) {
  const { default: NotFoundPage } = await import(pathToFileURL(notFoundPath).href);
  // 404 is standalone — no RootLayout. WordPress 404.php calls get_header/get_footer.
  notFoundHtml = renderToStaticMarkup(React.createElement(NotFoundPage));
}

// ── Extract SEO from layout.tsx source ───────────────────────────────────────
const seoProps = extractSeoPropsFromSource(layoutPath);
const headHtml = buildHeadHtml(seoProps);

// ── Write outputs ─────────────────────────────────────────────────────────────
const outDir = path.join(themeRoot, ".forgewp");
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, "header.html"), headerHtml, "utf8");
writeFileSync(path.join(outDir, "footer.html"), footerHtml, "utf8");
writeFileSync(path.join(outDir, "app.html"), appHtml, "utf8");
writeFileSync(path.join(outDir, "head.html"), headHtml, "utf8");

if (singleHtml) writeFileSync(path.join(outDir, "single.html"), singleHtml, "utf8");
if (notFoundHtml) writeFileSync(path.join(outDir, "404.html"), notFoundHtml, "utf8");

process.stdout.write(outDir);
