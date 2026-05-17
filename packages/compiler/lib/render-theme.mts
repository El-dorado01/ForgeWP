import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const themeRoot = process.argv[2];

if (!themeRoot) {
  console.error("Usage: render-theme.mts <theme-root>");
  process.exit(1);
}

const require = createRequire(path.join(themeRoot, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const appUrl = pathToFileURL(path.join(themeRoot, "src", "app", "page.tsx")).href;
const headerUrl = pathToFileURL(path.join(themeRoot, "src", "components", "SiteHeader.tsx")).href;
const footerUrl = pathToFileURL(path.join(themeRoot, "src", "components", "SiteFooter.tsx")).href;

const { default: App } = await import(appUrl);

let headerHtml = "";
try {
  const { SiteHeader } = await import(headerUrl);
  headerHtml = renderToStaticMarkup(React.createElement(SiteHeader));
} catch (e) {
  console.warn("SiteHeader not found, skipping separate render");
}

let footerHtml = "";
try {
  const { SiteFooter } = await import(footerUrl);
  footerHtml = renderToStaticMarkup(React.createElement(SiteFooter));
} catch (e) {
  console.warn("SiteFooter not found, skipping separate render");
}

let appHtml = "";
let headHtml = "";

try {
  const { HelmetProvider } = require("react-helmet-async");
  const helmetContext: any = {};
  appHtml = renderToStaticMarkup(
    React.createElement(HelmetProvider, { context: helmetContext }, React.createElement(App))
  );
  
  const { helmet } = helmetContext;
  if (helmet) {
    headHtml = helmet.title.toString() + "\n" + helmet.meta.toString() + "\n" + helmet.link.toString();
  }
} catch (e) {
  // Fallback if react-helmet-async is not installed
  appHtml = renderToStaticMarkup(React.createElement(App));
}

// Conditionally render single.tsx (Single post template)
const singlePath = path.join(themeRoot, "src", "app", "single.tsx");
let singleHtml = "";
if (existsSync(singlePath)) {
  try {
    const { default: SinglePage } = await import(pathToFileURL(singlePath).href);
    const { HelmetProvider } = require("react-helmet-async");
    const helmetContext: any = {};
    singleHtml = renderToStaticMarkup(
      React.createElement(HelmetProvider, { context: helmetContext }, React.createElement(SinglePage))
    );
  } catch (e) {
    const { default: SinglePage } = await import(pathToFileURL(singlePath).href);
    singleHtml = renderToStaticMarkup(React.createElement(SinglePage));
  }
}

// Conditionally render 404.tsx (Not found page template)
const notFoundPath = path.join(themeRoot, "src", "app", "404.tsx");
let notFoundHtml = "";
if (existsSync(notFoundPath)) {
  try {
    const { default: NotFoundPage } = await import(pathToFileURL(notFoundPath).href);
    const { HelmetProvider } = require("react-helmet-async");
    const helmetContext: any = {};
    notFoundHtml = renderToStaticMarkup(
      React.createElement(HelmetProvider, { context: helmetContext }, React.createElement(NotFoundPage))
    );
  } catch (e) {
    const { default: NotFoundPage } = await import(pathToFileURL(notFoundPath).href);
    notFoundHtml = renderToStaticMarkup(React.createElement(NotFoundPage));
  }
}

const outDir = path.join(themeRoot, ".forgewp");
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, "header.html"), headerHtml, "utf8");
writeFileSync(path.join(outDir, "footer.html"), footerHtml, "utf8");
writeFileSync(path.join(outDir, "app.html"), appHtml, "utf8");
writeFileSync(path.join(outDir, "head.html"), headHtml, "utf8");

if (singleHtml) {
  writeFileSync(path.join(outDir, "single.html"), singleHtml, "utf8");
}
if (notFoundHtml) {
  writeFileSync(path.join(outDir, "404.html"), notFoundHtml, "utf8");
}

process.stdout.write(outDir);
