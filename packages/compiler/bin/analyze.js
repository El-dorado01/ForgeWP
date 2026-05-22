#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { exec } from "node:child_process";
import { loadConfig } from "../lib/load-config.js";
import { scanForHydrationIslandsWithProps, runStaticLintChecks } from "../lib/hydration-scanner.js";
import { analyzeHydrationIslands, generateVisualReport } from "../lib/diagnostics.js";

console.log(`\n📊 ${pc.bold(pc.bgCyan(pc.black("  FORGEWP HYDRATION ANALYZER  ")))}\n`);

const projectRoot = process.cwd();

async function main() {
  // 1. Load config
  let config = { name: "Starter Theme", slug: "starter", version: "1.0.0" };
  try {
    const loaded = await loadConfig(projectRoot);
    if (loaded) {
      config = {
        name: loaded.name || config.name,
        slug: loaded.slug || config.slug,
        version: loaded.version || config.version,
      };
    }
  } catch (err) {
    console.warn(pc.yellow(`⚠️  Could not load wp.config.ts, using fallback values.`));
  }

  // 2. Scan islands
  const islands = scanForHydrationIslandsWithProps(projectRoot);
  if (islands.length === 0) {
    console.log(pc.yellow("⚠️  No hydration islands detected in src/app page files."));
    console.log(`   Wrap components in ${pc.bold("<Hydrate>")} to scan them.\n`);
    process.exit(0);
  }

  // 3. Resolve manifest
  const manifestPath = path.join(projectRoot, "dist", ".vite", "manifest.json");
  const manifestPathAlt = path.join(projectRoot, "dist", "manifest.json");
  const targetManifest = existsSync(manifestPath)
    ? manifestPath
    : existsSync(manifestPathAlt)
    ? manifestPathAlt
    : null;

  if (!targetManifest) {
    console.log(pc.red(`❌ ${pc.bold("Vite Manifest Not Found")}`));
    console.log(pc.yellow(`   Could not locate "dist/.vite/manifest.json" or "dist/manifest.json".`));
    console.log(pc.cyan(`   💡 Fix: Run "pnpm forgewp export" first to compile assets.\n`));
    process.exit(1);
  }

  let viteManifest = {};
  try {
    viteManifest = JSON.parse(readFileSync(targetManifest, "utf8"));
  } catch (e) {
    console.error(pc.red(`❌ Failed to parse Vite manifest: ${e.message}`));
    process.exit(1);
  }

  // 4. Map island kebab-case name to manifest chunk path
  const mapping = {};
  for (const island of islands) {
    const name = island.name;
    const pascalName = name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");

    let resolvedChunk = null;
    for (const [key, value] of Object.entries(viteManifest)) {
      if (
        key.endsWith(`${pascalName}.tsx`) ||
        key.endsWith(`${pascalName}.ts`) ||
        key.endsWith(`${name}.tsx`) ||
        key.endsWith(`${name}.ts`) ||
        (value.file && value.file.includes(name))
      ) {
        resolvedChunk = value.file;
        break;
      }
    }

    if (resolvedChunk) {
      mapping[name] = resolvedChunk;
    }
  }

  // 5. Compute diagnostics
  const analysis = analyzeHydrationIslands(projectRoot, mapping);

  // 6. Run Static Lint Checks
  const violations = runStaticLintChecks(projectRoot);
  analysis.violations = violations;

  // 7. Generate HTML report
  let reportPath;
  try {
    reportPath = generateVisualReport(projectRoot, analysis, islands, config);
  } catch (err) {
    console.error(pc.red(`❌ Failed to generate HTML report: ${err.message}`));
    process.exit(1);
  }

  // 8. Output terminal summary
  console.log(`  Project: ${pc.cyan(config.name)} (${pc.dim(config.slug)})`);
  console.log(`  Total Islands Scanned: ${pc.cyan(islands.length)}`);
  console.log(`  Heavy Islands (>100 kB): ${analysis.heavyCount > 0 ? pc.red(analysis.heavyCount) : pc.green(0)}`);
  
  const totalJsKb = analysis.results.reduce((acc, curr) => acc + curr.sizeKb, 0);
  console.log(`  Total Client JS Weight: ${totalJsKb > 200 ? pc.red(totalJsKb.toFixed(1) + " kB") : pc.green(totalJsKb.toFixed(1) + " kB")}`);

  if (violations.length > 0) {
    console.log(`\n⚠️  ${pc.bold(pc.yellow("THEME LINT WARNINGS & SEO RECOMMENDATIONS"))}`);
    for (const v of violations) {
      const icon = v.severity === "error" ? pc.red("❌ ERROR") : pc.yellow("⚠️  WARN");
      console.log(`   ${icon} ${pc.bold(v.file)}: ${v.message}`);
      if (v.lineContent) {
        console.log(`      ${pc.dim("👉 Code:")} ${pc.italic(v.lineContent)}`);
      }
    }
  } else {
    console.log(`\n✅ ${pc.green(pc.bold("Best Practices Audit Passed:"))} 0 lint or SEO violations detected!`);
  }

  console.log(`\n🎉 ${pc.green(pc.bold("HTML Diagnostic Report generated successfully!"))}`);
  console.log(`   Report path: ${pc.dim(reportPath)}`);

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

  console.log(`   Opening report in your browser...\n`);
  exec(command, (err) => {
    if (err) {
      console.warn(pc.yellow(`⚠️  Failed to open browser automatically: ${err.message}`));
    }
  });
}

main().catch((err) => {
  console.error(pc.red(`❌ Unexpected analyzer error: ${err.message}`));
  process.exit(1);
});
