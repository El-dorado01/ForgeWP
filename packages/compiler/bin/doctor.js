#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { scanForHydrationIslands, runStaticLintChecks } from "../lib/hydration-scanner.js";
import { analyzeHydrationIslands, printDiagnosticsReport } from "../lib/diagnostics.js";

console.log(`\n🩺 ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SYSTEM DOCTOR  ")))}\n`);

const projectRoot = process.cwd();
let issuesFound = 0;

// Load configuration and framework adapter
let frameworkAdapter = "react";
let adapter = null;
try {
  const config = await loadConfig(projectRoot);
  frameworkAdapter = config.frameworkAdapter || "react";
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  adapter = adapterModule.default || adapterModule;
} catch (err) {
  // Use default react adapter
}

function runCheck(name, fn) {
  process.stdout.write(`  Checking ${name.padEnd(45, ".")} `);
  try {
    const warning = fn();
    if (warning) {
      console.log(pc.yellow("⚠️  WARNING"));
      console.log(pc.yellow(`     👉 ${warning}`));
      issuesFound++;
    } else {
      console.log(pc.green("✅ OK"));
    }
  } catch (err) {
    console.log(pc.red("❌ FAILED"));
    console.log(pc.red(`     👉 Error: ${err.message}`));
    issuesFound++;
  }
}

// 1. Node Version Check
runCheck("Node.js Runtime Environment", () => {
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 18) {
    return `Your Node version is v${process.version}. ForgeWP recommends Node v18+ for compiling React themes.`;
  }
  return null;
});

// 2. User Editable Files
runCheck("User Configuration & HTML Layout", () => {
  const critical = ["wp.config.ts", "package.json", "index.html"];
  if (adapter && typeof adapter.getCriticalFiles === "function") {
    const adapterFiles = adapter.getCriticalFiles(projectRoot);
    if (Array.isArray(adapterFiles)) {
      critical.push(...adapterFiles);
    }
  }
  for (const f of critical) {
    if (!existsSync(path.join(projectRoot, f))) {
      throw new Error(`Critical file "${f}" is missing from project root!`);
    }
  }
  return null;
});

// 3. Database Check
runCheck("Mock Database Schema Integration", () => {
  const dbPath = path.join(projectRoot, "cms", "mock-data.json");
  if (!existsSync(dbPath)) {
    throw new Error(`Database "cms/mock-data.json" was not found!`);
  }
  try {
    JSON.parse(readFileSync(dbPath, "utf8"));
  } catch (err) {
    throw new Error(`Database "cms/mock-data.json" contains invalid JSON syntax!\n        Message: ${err.message}`);
  }
  return null;
});

// 4. System Files Integrity Check
runCheck("System Internal Framework Libraries", () => {
  const systemFiles = Object.keys(SYSTEM_BLUEPRINTS);
  const missing = [];
  for (const sf of systemFiles) {
    if (!existsSync(path.join(projectRoot, sf))) {
      missing.push(sf);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Framework internal files are missing: ${missing.join(", ")}\n        💡 Fix: Run "pnpm forgewp repair" to auto-heal system boundaries!`);
  }
  return null;
});

// 5. Tailwind Integration Check
runCheck("Tailwind Styling Architecture", () => {
  const cssFile1 = path.join(projectRoot, "src", "index.css");
  const cssFile2 = path.join(projectRoot, "src", "app", "globals.css");
  if (!existsSync(cssFile1) && !existsSync(cssFile2)) {
    return `Style sheet (src/index.css or src/app/globals.css) is missing. Please ensure your Tailwind styles are loaded.`;
  }
  return null;
});

// 6. Active Hydration Islands Diagnostics
runCheck("Selective Hydration Islands Diagnostics", () => {
  const islands = scanForHydrationIslands(projectRoot);
  if (islands.length === 0) {
    return null;
  }

  const manifestPath = path.join(projectRoot, 'dist', '.vite', 'manifest.json');
  const manifestPathAlt = path.join(projectRoot, 'dist', 'manifest.json');
  const targetManifest = existsSync(manifestPath) ? manifestPath : (existsSync(manifestPathAlt) ? manifestPathAlt : null);
  
  if (!targetManifest) {
    return `Found ${islands.length} active island(s) in source files, but no compiled build dist folder. Run "pnpm forgewp export" first to analyze bundle sizes.`;
  }
  
  let viteManifest = {};
  try {
    viteManifest = JSON.parse(readFileSync(targetManifest, "utf8"));
  } catch (e) {
    throw new Error(`Failed to parse Vite manifest: ${e.message}`);
  }

  const mapping = {};
  for (const island of islands) {
    const pascalName = island
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    let resolvedChunk = null;
    for (const [key, value] of Object.entries(viteManifest)) {
      if (
        key.endsWith(`${pascalName}.tsx`) ||
        key.endsWith(`${pascalName}.ts`) ||
        key.endsWith(`${island}.tsx`) ||
        key.endsWith(`${island}.ts`) ||
        (value.file && value.file.includes(island))
      ) {
        resolvedChunk = value.file;
        break;
      }
    }

    if (resolvedChunk) {
      mapping[island] = resolvedChunk;
    }
  }

  const analysis = analyzeHydrationIslands(projectRoot, mapping);
  console.log("");
  printDiagnosticsReport(analysis);
  
  if (analysis.heavyCount > 0) {
    return `Detected ${analysis.heavyCount} heavy interactive island(s) exceeding 100 kB threshold. Audit recommends optimizing dynamic imports or changing strategies.`;
  }
  
  return null;
});

// 7. Static Code Lint & SEO Best Practices
runCheck("Static Code Lint & SEO Best Practices", () => {
  const violations = runStaticLintChecks(projectRoot);
  if (violations.length === 0) {
    return null;
  }
  
  const errors = violations.filter(v => v.severity === "error").length;
  const warnings = violations.filter(v => v.severity === "warning").length;
  
  console.log("");
  for (const v of violations) {
    const prefix = v.severity === "error" ? pc.red("    [ERROR]") : pc.yellow("    [WARN] ");
    console.log(`${prefix} ${pc.bold(v.file)}: ${v.message}`);
  }
  
  return `Detected ${errors} error(s) and ${warnings} warning(s) in template source files. Run "pnpm forgewp analyze" to review detailed remedies inside the visual report.`;
});

// Final Diagnostic
console.log("\n" + "─".repeat(60));
if (issuesFound === 0) {
  console.log(pc.green(`\n🎉 ${pc.bold("SYSTEM HEALTHY:")} Your ForgeWP monorepo is in perfect condition!`));
  console.log(pc.cyan("   You are ready to compile, scaffold, and upload themes safely.\n"));
} else {
  console.log(pc.red(`\n❌ ${pc.bold("DIAGNOSTIC COMPLETED:")} Found ${issuesFound} active system issue(s).`));
  console.log(pc.yellow(`   💡 Tip: Follow the instructions above or run "pnpm forgewp repair" to auto-heal framework internals.\n`));
  process.exit(1);
}
