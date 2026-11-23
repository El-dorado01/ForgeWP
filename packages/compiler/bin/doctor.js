#!/usr/bin/env node
import { isSupportedNode, SUPPORTED_NODE_RANGE } from '../lib/node-runtime.js';

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { diagnoseNextNativeCompatibility } from "../lib/next-adapter.js";
import { findWpConfigPath } from "../lib/project-language.js";
import { scanForHydrationIslands, runStaticLintChecks } from "../lib/hydration/index.js";
import { analyzeHydrationIslands, printDiagnosticsReport } from "../lib/diagnostics.js";
import {
  VALID_DOCTOR_TARGETS,
  buildRouteCapabilityManifest,
  evaluateTargetCompatibility,
  writeRouteCapabilityManifest,
} from "../lib/route-manifest.js";
import { createUi, formatDuration } from "../lib/terminal-ui.js";

const ui = createUi();
const { c } = ui;
const startedAt = Date.now();

function parseDoctorArgs(argv) {
  let target = null;
  let json = false;
  let writeManifest = false;
  let manifestOutPath = null;
  let help = false;
  let argError = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "-h" || arg === "--help") {
      help = true;
    } else if (arg === "--target") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        argError = `Missing value for --target. Expected one of: ${VALID_DOCTOR_TARGETS.join(", ")}.`;
      } else {
        target = next.toLowerCase();
        i++;
      }
    } else if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length).toLowerCase();
    } else if (arg === "--write-manifest" || arg === "--manifest") {
      writeManifest = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        manifestOutPath = next;
        i++;
      }
    } else if (arg.startsWith("--write-manifest=")) {
      writeManifest = true;
      manifestOutPath = arg.slice("--write-manifest=".length) || null;
    } else if (arg.startsWith("--manifest=")) {
      writeManifest = true;
      manifestOutPath = arg.slice("--manifest=".length) || null;
    }
  }

  if (!argError && target !== null && !VALID_DOCTOR_TARGETS.includes(target)) {
    argError = `Invalid --target "${target}". Expected one of: ${VALID_DOCTOR_TARGETS.join(", ")}.`;
  }

  return { target, json, writeManifest, manifestOutPath, help, argError };
}

const cliOptions = parseDoctorArgs(process.argv.slice(2));

if (cliOptions.help) {
  console.log(`Usage: forgewp doctor [options]

Options:
  --target <native|decoupled|hybrid>  Validate route & feature compatibility for a deployment target
  --json                              Output machine-readable JSON report to stdout
  --write-manifest [path]             Emit Route Capability Manifest (default: .forgewp/forgewp-manifest.json)
  -h, --help                          Show this help message
`);
  process.exit(0);
}

if (cliOptions.argError) {
  if (cliOptions.json) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: cliOptions.argError }, null, 2)}\n`);
  } else {
    console.error(`\n${ui.error(cliOptions.argError)}\n`);
  }
  process.exit(1);
}

const projectRoot = process.cwd();
let failuresFound = 0;
let warningsFound = 0;
const checkResults = [];

// Load configuration and framework adapter (silence stray stdout logs in --json mode)
let frameworkAdapter = "react";
let adapter = null;
let loadedConfig = null;
let configLoadError = null;
const origConsoleLog = console.log;
if (cliOptions.json) console.log = () => {};
try {
  const config = await loadConfig(projectRoot);
  loadedConfig = config;
  frameworkAdapter = config.frameworkAdapter || "react";
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  adapter = adapterModule.default || adapterModule;
} catch (err) {
  configLoadError = err;
} finally {
  console.log = origConsoleLog;
}

if (!cliOptions.json) {
  console.log(ui.header('doctor', loadedConfig ? `${loadedConfig.name} · ${frameworkAdapter}` : undefined));
}
let checksRun = 0;

/**
 * Run one check. Anything the check prints is collected and shown indented under
 * its result line, so detail never interleaves with a half-written status line.
 */
function runCheck(name, fn) {
  const captured = [];
  const originalLog = console.log;
  console.log = (...args) => captured.push(args.join(" "));
  let status = "ok";
  let note = null;
  try {
    const warning = fn();
    if (warning) {
      status = "warn";
      note = warning;
      warningsFound++;
    }
  } catch (err) {
    status = "fail";
    note = err.message;
    failuresFound++;
  } finally {
    console.log = originalLog;
  }
  checksRun++;
  checkResults.push({
    name,
    status,
    note,
  });

  if (!cliOptions.json) {
    const print = status === "ok" ? ui.done : status === "warn" ? ui.warn : ui.error;
    console.log(print(name));
    const detailLines = captured.join("\n").split("\n").filter((line) => line.trim() !== "");
    for (const line of detailLines) console.log(`    ${line.replace(/^\s{0,4}/, "")}`);
    if (note) console.log(ui.detail(note));
  }
}

// 1. Node Version Check
runCheck("Node.js Runtime Environment", () => {
  if (!isSupportedNode()) {
    return `Your Node version is ${process.version}. ForgeWP requires Node.js ${SUPPORTED_NODE_RANGE}.`;
  }
  return null;
});

// 2. User Editable Files
runCheck("User Configuration & HTML Layout", () => {
  const critical =
    adapter && typeof adapter.getCriticalFiles === "function"
      ? Array.from(new Set(adapter.getCriticalFiles(projectRoot)))
      : ["wp.config.ts", "package.json", "index.html"];
  for (const f of critical) {
    if (f === "wp.config.ts") {
      if (!findWpConfigPath(projectRoot)) {
        throw new Error(`Critical file "wp.config.ts" (or "wp.config.js") is missing from project root!`);
      }
      continue;
    }
    const existsExact = existsSync(path.join(projectRoot, f));
    const existsJsAlt =
      (f.endsWith(".tsx") &&
        (existsSync(path.join(projectRoot, f.replace(/\.tsx$/, ".jsx"))) ||
          existsSync(path.join(projectRoot, f.replace(/\.tsx$/, ".js"))))) ||
      (f.endsWith(".ts") &&
        (existsSync(path.join(projectRoot, f.replace(/\.ts$/, ".mjs"))) ||
          existsSync(path.join(projectRoot, f.replace(/\.ts$/, ".js")))));
    if (!existsExact && !existsJsAlt) {
      throw new Error(`Critical file "${f}" is missing from project root!`);
    }
  }
  if (configLoadError) {
    throw new Error(`Failed to load wp.config configuration:\n        👉 ${configLoadError.message}`);
  }
  return null;
});

// 3. Database Check
runCheck("Mock Database Schema Integration", () => {
  const dbScriptPath = [".ts", ".mjs", ".js"]
    .map((ext) => path.join(projectRoot, "cms", `mock-data${ext}`))
    .find((p) => existsSync(p));
  const dbJsonPath = path.join(projectRoot, "cms", "mock-data.json");
  if (!dbScriptPath && !existsSync(dbJsonPath)) {
    throw new Error(`Database "cms/mock-data.ts" (or ".js" / ".json") was not found!`);
  }
  if (existsSync(dbJsonPath)) {
    try {
      JSON.parse(readFileSync(dbJsonPath, "utf8"));
    } catch (err) {
      throw new Error(`Database "cms/mock-data.json" contains invalid JSON syntax!\n        Message: ${err.message}`);
    }
  }
  return null;
});

// 4. System Files Integrity Check
runCheck("System Internal Framework Libraries", () => {
  if (adapter?.skipSystemBlueprints) {
    return null;
  }
  const systemFiles = Object.keys(SYSTEM_BLUEPRINTS);
  const missing = [];
  for (const sf of systemFiles) {
    if (sf.startsWith("cms/") && sf.endsWith(".json")) {
      const hasScriptVariant = [".ts", ".mjs", ".js"].some((ext) =>
        existsSync(path.join(projectRoot, sf.replace(/\.json$/, ext))),
      );
      if (hasScriptVariant) {
        continue;
      }
    }
    if (!existsSync(path.join(projectRoot, sf))) {
      missing.push(sf);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Framework internal files are missing: ${missing.join(", ")}\n        💡 Fix: Run "pnpm forgewp repair" to auto-heal system boundaries!`);
  }
  return null;
});

// 4.5 Next.js Native vs. Decoupled Compatibility Audit
if (frameworkAdapter === "nextjs") {
  runCheck("Next.js Config & Native Compatibility", () => {
    const nextConfigFile = ["next.config.ts", "next.config.mjs", "next.config.js", "next.config.cjs"].find((f) =>
      existsSync(path.join(projectRoot, f)),
    );
    const warnings = [];
    if (nextConfigFile) {
      const cfgSrc = readFileSync(path.join(projectRoot, nextConfigFile), "utf8");
      if (!/\bwithForgeWP\b/.test(cfgSrc)) {
        warnings.push(
          `${nextConfigFile} does not use withForgeWP() from @forgewp/react/next. Run "pnpm forgewp init" to wrap it automatically.`,
        );
      }
    }
    const compat = diagnoseNextNativeCompatibility(projectRoot);
    if (!compat.ok) {
      console.log("");
      for (const err of compat.errors) {
        console.log(`${c.yellow(ui.symbols.warn)} ${c.bold(err.file)}  ${err.message} ${c.dim(`[${err.code}]`)}`);
        console.log(`  ${c.dim(`${ui.symbols.arrow} ${err.suggestion}`)}`);
      }
      warnings.push(
        `Found ${compat.errors.length} server-only Next.js feature(s). Use decoupled mode (FORGEWP_DEPLOYMENT_MODE=decoupled) or refactor them for native WordPress export.`,
      );
    }
    for (const w of compat.warnings) {
      warnings.push(`[${w.code}] ${w.file}: ${w.message}`);
    }
    return warnings.length > 0 ? warnings.join("\n        👉 ") : null;
  });
}

// 5. Tailwind / Global CSS Integration Check
runCheck("Global Stylesheet Architecture", () => {
  const cssFile1 = path.join(projectRoot, "src", "index.css");
  const cssFile2 = path.join(projectRoot, "src", "app", "globals.css");
  const cssFile3 = path.join(projectRoot, "app", "globals.css");
  if (!existsSync(cssFile1) && !existsSync(cssFile2) && !existsSync(cssFile3)) {
    return `Style sheet (src/index.css or src/app/globals.css) is missing. Please ensure your styles are loaded.`;
  }
  return null;
});

// 6. Active Hydration Islands Diagnostics
runCheck("Selective Hydration Islands Diagnostics", () => {
  const islands =
    adapter && typeof adapter.scanForHydrationIslands === "function"
      ? adapter.scanForHydrationIslands(projectRoot)
      : scanForHydrationIslands(projectRoot);
  if (islands.length === 0) {
    return null;
  }

  if (frameworkAdapter === "nextjs") {
    const slug = loadedConfig?.slug || path.basename(projectRoot);
    const islandsOutDir = path.join(projectRoot, ".forgewp", "out", slug, "assets", "islands");
    if (!existsSync(islandsOutDir)) {
      return `Found ${islands.length} explicit Next.js hydration island(s) (${islands.join(", ")}), but no exported theme output yet. Run "pnpm forgewp export" to bundle and verify them.`;
    }
    const missingChunks = islands.filter(
      (island) => !existsSync(path.join(islandsOutDir, `${island}.js`)),
    );
    if (missingChunks.length > 0) {
      return `Missing bundled Next.js island chunk(s): ${missingChunks.join(", ")}. Re-run "pnpm forgewp export".`;
    }
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
      const fileBasename = path.basename(value.file || '');
      const cleanName = fileBasename.replace(/-[A-Za-z0-9_-]+\.js$/, '');
      if (
        key.endsWith(`/${pascalName}.tsx`) ||
        key.endsWith(`/${pascalName}.ts`) ||
        key.endsWith(`/${island}.tsx`) ||
        key.endsWith(`/${island}.ts`) ||
        cleanName === island ||
        cleanName === pascalName.toLowerCase()
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
  const rawViolations = runStaticLintChecks(projectRoot);
  const violations =
    frameworkAdapter === "nextjs"
      ? rawViolations.filter(
          (v) => !String(v.message || "").includes("Missing SEO <WpHead>"),
        )
      : rawViolations;
  if (violations.length === 0) {
    return null;
  }
  
  const errors = violations.filter(v => v.severity === "error").length;
  const warnings = violations.filter(v => v.severity === "warning").length;
  
  console.log("");
  for (const v of violations) {
    const symbol = v.severity === "error" ? c.red(ui.symbols.error) : c.yellow(ui.symbols.warn);
    console.log(`${symbol} ${c.bold(v.file)}  ${v.message}`);
  }
  
  return `Detected ${errors} error(s) and ${warnings} warning(s) in template source files. Run "pnpm forgewp analyze" to review detailed remedies inside the visual report.`;
});

// 8. Route Capability Manifest & Target Compatibility (--target native|decoupled|hybrid)
const routeManifest = buildRouteCapabilityManifest(projectRoot, {
  config: loadedConfig || undefined,
});

let writtenManifestPath = null;
if (cliOptions.writeManifest) {
  runCheck("Route Capability Manifest", () => {
    writtenManifestPath = writeRouteCapabilityManifest(
      projectRoot,
      routeManifest,
      cliOptions.manifestOutPath || undefined,
    );
    const relOut = path.relative(projectRoot, writtenManifestPath).replace(/\\/g, "/");
    console.log(`Wrote ${relOut} (${Object.keys(routeManifest.routes).length} routes)`);
    return null;
  });
}

let targetCompatibility = null;
if (cliOptions.target) {
  targetCompatibility = evaluateTargetCompatibility(routeManifest, cliOptions.target);
  runCheck(`Target Compatibility (${cliOptions.target})`, () => {
    const s = targetCompatibility.summary;
    console.log(
      `Routes: ${s.totalRoutes} total · ${s.portableRoutes} portable · ${s.nativePinnedRoutes} native-pinned · ${s.decoupledPinnedRoutes} decoupled-pinned · ${s.hybridDelegatedRoutes} hybrid`,
    );

    if (targetCompatibility.errors.length > 0) {
      console.log("");
      for (const err of targetCompatibility.errors) {
        const loc = err.route || err.file || err.form || "project";
        console.log(`${c.red(ui.symbols.error)} ${c.bold(loc)}  ${err.message} ${c.dim(`[${err.code}]`)}`);
        if (err.suggestion) {
          console.log(`  ${c.dim(`${ui.symbols.arrow} ${err.suggestion}`)}`);
        }
      }
      if (targetCompatibility.suggestedHybridRoutes.length > 0) {
        console.log("");
        console.log(
          `${c.dim("Suggested hybridRoutes:")} ${JSON.stringify(targetCompatibility.suggestedHybridRoutes)}`,
        );
      }
      throw new Error(
        `Project is NOT compatible with --target ${cliOptions.target} (${targetCompatibility.errors.length} blocking error${targetCompatibility.errors.length === 1 ? "" : "s"}).`,
      );
    }

    if (targetCompatibility.warnings.length > 0) {
      console.log("");
      for (const w of targetCompatibility.warnings) {
        const loc = w.route || w.file || w.feature || "project";
        console.log(`${c.yellow(ui.symbols.warn)} ${c.bold(loc)}  ${w.message} ${c.dim(`[${w.code}]`)}`);
        if (w.suggestion) {
          console.log(`  ${c.dim(`${ui.symbols.arrow} ${w.suggestion}`)}`);
        }
      }
      return `Compatible with --target ${cliOptions.target}, with ${targetCompatibility.warnings.length} warning${targetCompatibility.warnings.length === 1 ? "" : "s"}.`;
    }

    return null;
  });
}

const durationMs = Date.now() - startedAt;

if (cliOptions.json) {
  const targetsSummary = cliOptions.target
    ? { [cliOptions.target]: targetCompatibility }
    : {
        native: evaluateTargetCompatibility(routeManifest, "native"),
        decoupled: evaluateTargetCompatibility(routeManifest, "decoupled"),
        hybrid: evaluateTargetCompatibility(routeManifest, "hybrid"),
      };
  const compatible = targetCompatibility ? targetCompatibility.compatible : failuresFound === 0;
  const ok = failuresFound === 0 && compatible;
  const payload = {
    ok,
    compatible,
    target: cliOptions.target,
    project: {
      name: loadedConfig?.name || routeManifest.project.name,
      slug: loadedConfig?.slug || routeManifest.project.slug,
      frameworkAdapter: loadedConfig?.frameworkAdapter || routeManifest.project.frameworkAdapter,
    },
    ...(writtenManifestPath
      ? { manifestPath: path.relative(projectRoot, writtenManifestPath).replace(/\\/g, "/") }
      : {}),
    checks: checkResults,
    ...(targetCompatibility ? { targetCompatibility } : {}),
    targets: targetsSummary,
    manifest: routeManifest,
    summary: {
      checksRun,
      failures: failuresFound,
      warnings: warningsFound,
      durationMs,
    },
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

// Final Diagnostic
const summaryMeta = `${checksRun} checks · ${formatDuration(durationMs)}`;
console.log("");
if (failuresFound === 0) {
  if (warningsFound > 0) {
    console.log(`  ${c.yellow(ui.symbols.warn)} ${c.bold(`Ready, with ${warningsFound} warning${warningsFound === 1 ? "" : "s"}`)}  ${c.dim(summaryMeta)}`);
    console.log(`${ui.detail("Your project works; the notes above are recommendations.")}\n`);
  } else {
    console.log(`  ${c.green(ui.symbols.done)} ${c.bold("Project healthy")}  ${c.dim(summaryMeta)}`);
    console.log(`${ui.detail(`Ready to build. Run ${ui.command("pnpm forgewp export")} when you are.`)}\n`);
  }
  process.exit(0);
} else {
  console.log(`  ${c.red(ui.symbols.error)} ${c.bold(`${failuresFound} problem${failuresFound === 1 ? "" : "s"} found`)}${warningsFound ? `, ${warningsFound} warning${warningsFound === 1 ? "" : "s"}` : ""}  ${c.dim(summaryMeta)}`);
  console.log(`${ui.detail(`Fix the problems above, or run ${ui.command("pnpm forgewp repair")} to restore missing framework files.`)}\n`);
  process.exit(1);
}
