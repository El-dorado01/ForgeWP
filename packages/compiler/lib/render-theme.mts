import { mkdirSync, writeFileSync } from "node:fs";
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

const outDir = path.join(themeRoot, ".forgewp");
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, "header.html"), headerHtml, "utf8");
writeFileSync(path.join(outDir, "footer.html"), footerHtml, "utf8");
writeFileSync(path.join(outDir, "app.html"), appHtml, "utf8");
writeFileSync(path.join(outDir, "head.html"), headHtml, "utf8");

process.stdout.write(outDir);
