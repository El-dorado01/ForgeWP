#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createUi } from "../lib/terminal-ui.js";

import { exec } from "node:child_process";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { scanForHydrationIslandsWithProps, runStaticLintChecks } from "../lib/hydration/index.js";
import { analyzeHydrationIslands, generateVisualReport } from "../lib/diagnostics.js";

const ui = createUi();
const { c } = ui;

console.log(ui.header("analyze", "islands, bundle size, auth and lint"));

const projectRoot = process.cwd();

async function main() {
  // 1. Load config & framework adapter
  let config = { name: "Starter Theme", slug: "starter", version: "1.0.0", frameworkAdapter: "react" };
  let adapter = null;
  try {
    const loaded = await loadConfig(projectRoot);
    if (loaded) {
      config = {
        name: loaded.name || config.name,
        slug: loaded.slug || config.slug,
        version: loaded.version || config.version,
        frameworkAdapter: loaded.frameworkAdapter || "react",
      };
    }
    const adapterMod = await loadFrameworkAdapter(config.frameworkAdapter);
    adapter = adapterMod.default || adapterMod;
  } catch (err) {
    console.warn(ui.warn("Could not load wp.config", "using defaults"));
  }

  // 2. Scan islands
  const isNextAdapter = config.frameworkAdapter === "nextjs";
  const islands = isNextAdapter && typeof adapter?.scanForHydrationIslands === "function"
    ? adapter.scanForHydrationIslands(projectRoot).map((name) => ({
        name,
        file: adapter.findComponentPath?.(projectRoot, name) || name,
        trigger: "visible",
        preload: "none",
        media: null,
        connection: null,
        clientOnly: false,
      }))
    : scanForHydrationIslandsWithProps(projectRoot);

  if (islands.length === 0) {
    console.log(ui.info("No hydration islands found", "in src/app pages"));
    console.log(`${ui.tip(`Wrap an interactive component in ${ui.command("<Hydrate>")} to analyze it.`)}\n`);
    process.exit(0);
  }

  // 3. Resolve manifest / chunk mapping
  const mapping = {};
  if (isNextAdapter) {
    const outRoot = path.join(projectRoot, ".forgewp", "out", config.slug);
    const islandsDir = path.join(outRoot, "assets", "islands");
    if (!existsSync(islandsDir)) {
      console.log(ui.errorBlock("No exported islands to analyze", `Looked in ${path.relative(projectRoot, islandsDir)}.`, `Run ${ui.command("pnpm forgewp export")} first, then analyze again.`));
      process.exit(1);
    }
    for (const island of islands) {
      const chunkAbs = path.join(islandsDir, `${island.name}.js`);
      if (existsSync(chunkAbs)) {
        mapping[island.name] = path.relative(path.join(projectRoot, "dist"), chunkAbs);
      }
    }
  } else {
    const manifestPath = path.join(projectRoot, "dist", ".vite", "manifest.json");
    const manifestPathAlt = path.join(projectRoot, "dist", "manifest.json");
    const targetManifest = existsSync(manifestPath)
      ? manifestPath
      : existsSync(manifestPathAlt)
      ? manifestPathAlt
      : null;

    if (!targetManifest) {
      console.log(ui.errorBlock("No build to analyze", "dist/.vite/manifest.json was not found.", `Run ${ui.command("pnpm forgewp export")} first, then analyze again.`));
      process.exit(1);
    }

    let viteManifest = {};
    try {
      viteManifest = JSON.parse(readFileSync(targetManifest, "utf8"));
    } catch (e) {
      console.error(ui.errorBlock("Could not read the Vite manifest", e.message));
      process.exit(1);
    }

    // 4. Map island kebab-case name to manifest chunk path
    for (const island of islands) {
      const name = island.name;
      const pascalName = name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");

      let resolvedChunk = null;
      for (const [key, value] of Object.entries(viteManifest)) {
        const fileBasename = path.basename(value.file || '');
        const cleanName = fileBasename.replace(/-[A-Za-z0-9_-]+\.js$/, '');
        if (
          key.endsWith(`/${pascalName}.tsx`) ||
          key.endsWith(`/${pascalName}.ts`) ||
          key.endsWith(`/${name}.tsx`) ||
          key.endsWith(`/${name}.ts`) ||
          cleanName === name ||
          cleanName === pascalName.toLowerCase()
        ) {
          resolvedChunk = value.file;
          break;
        }
      }

      if (resolvedChunk) {
        mapping[name] = resolvedChunk;
      }
    }
  }

  // 5. Compute diagnostics
  const analysis = analyzeHydrationIslands(projectRoot, mapping);

  // 6. Run Static Lint Checks
  const violations = runStaticLintChecks(projectRoot);
  analysis.violations = violations;

  // 6.5. Run Auth Security checks & parse manifest
  const authManifestPath = path.join(projectRoot, ".forgewp", "out", config.slug, "auth-manifest.json");
  let authManifest = { protectedPages: [], authGates: [] };
  if (existsSync(authManifestPath)) {
    try {
      authManifest = JSON.parse(readFileSync(authManifestPath, "utf8"));
    } catch {}
  }

  const authWarnings = [];
  const pagesDir = path.join(projectRoot, "src", "app", "pages");
  if (existsSync(pagesDir)) {
    const collectPagesRecursive = (dir, list = []) => {
      const items = readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          collectPagesRecursive(fullPath, list);
        } else if (item.isFile() && (item.name.endsWith(".tsx") || item.name.endsWith(".ts"))) {
          list.push(fullPath);
        }
      }
      return list;
    };
    try {
      const pageFiles = collectPagesRecursive(pagesDir);
      for (const file of pageFiles) {
        const content = readFileSync(file, "utf8");
        const hasAuthHooks = content.includes("useWpAuth") || content.includes("useWpUser");
        if (hasAuthHooks) {
          const fileBasename = path.basename(file, path.extname(file));
          const slug = fileBasename
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
          
          const isPageProtected = authManifest.protectedPages.some(
            p => p.page === slug || p.page === slug.replace(/-page$/, "")
          );
          
          if (!isPageProtected) {
            authWarnings.push({
              file: path.relative(projectRoot, file),
              message: `Page utilizes authentication hooks (useWpAuth/useWpUser) but is not protected by server-side page guards.`
            });
          }
        }
      }
    } catch {}
  }

  // 7. Generate HTML report
  let reportPath;
  try {
    reportPath = generateVisualReport(projectRoot, analysis, islands, config);
  } catch (err) {
    console.error(ui.errorBlock("Could not write the HTML report", err.message));
    process.exit(1);
  }

  // 8. Output terminal summary
  const totalJsKb = analysis.results.reduce((acc, curr) => acc + curr.sizeKb, 0);
  const heavy = analysis.heavyCount;
  console.log(`  ${c.bold("Islands")}  ${c.dim(`${config.name}`)}`);
  console.log(heavy > 0
    ? ui.warn(`${islands.length} island${islands.length === 1 ? "" : "s"}, ${heavy} over 100 kB`, `${totalJsKb.toFixed(1)} kB client JS`)
    : ui.done(`${islands.length} island${islands.length === 1 ? "" : "s"}, none over 100 kB`, `${totalJsKb.toFixed(1)} kB client JS`));

  const loggedInGates = authManifest.authGates.filter((g) => g.type === "logged_in").length;
  const capabilityGates = authManifest.authGates.filter((g) => g.type === "capability").length;
  console.log(`\n  ${c.bold("Auth")}`);
  console.log(ui.info(`${authManifest.protectedPages.length} protected page${authManifest.protectedPages.length === 1 ? "" : "s"}`, `${loggedInGates} login gate${loggedInGates === 1 ? "" : "s"} · ${capabilityGates} capability gate${capabilityGates === 1 ? "" : "s"}`));
  if (authWarnings.length > 0) {
    for (const w of authWarnings) console.log(ui.warn(w.file, w.message));
  } else {
    console.log(ui.done("No unprotected auth hooks"));
  }

  console.log(`\n  ${c.bold("Lint & SEO")}`);
  if (violations.length > 0) {
    for (const v of violations) {
      console.log((v.severity === "error" ? ui.error : ui.warn)(v.file, v.message));
      if (v.lineContent) console.log(ui.detail(v.lineContent.trim()));
    }
  } else {
    console.log(ui.done("No lint or SEO issues"));
  }

  console.log(`\n  ${c.green(ui.symbols.done)} ${c.bold("Report ready")}  ${c.dim(path.relative(projectRoot, reportPath).replaceAll("\\", "/"))}`);

  // 8. Auto-open report in the browser
  const startCommand =
    process.platform === "win32"
      ? "start"
      : process.platform === "darwin"
      ? "open"
      : "xdg-open";

  const command =
    process.platform === "win32"
      ? `start "" "${reportPath}"`
      : `${startCommand} "${reportPath}"`;

  // Only open a browser for someone at an interactive terminal (not CI or piped output).
  if (!process.stdout.isTTY || process.env.CI) {
    console.log("");
    return;
  }
  console.log(`${ui.detail("Opening it in your browser…")}\n`);
  exec(command, (err) => {
    if (err) {
      console.warn(ui.warn("Could not open the browser", `open ${reportPath} yourself`));
    }
  });
}

main().catch((err) => {
  console.error(ui.errorBlock("analyze failed", err.message));
  process.exit(1);
});
