#!/usr/bin/env node

import { rmSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { createUi, formatDuration } from "../lib/terminal-ui.js";

import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { findWpConfigPath, getProjectExtensions } from "../lib/project-language.js";

const ui = createUi();
const { c } = ui;

console.log(ui.header("fresh", "reset to a clean starter"));

const projectRoot = process.cwd();

async function runReset() {
  const { jsxExt } = getProjectExtensions(projectRoot);
  const configFileLabel = findWpConfigPath(projectRoot)?.fileName || "wp.config.ts (or wp.config.js)";
  // Load the project config to determine the framework adapter
  let frameworkAdapter = 'react';
  try {
    const config = await loadConfig(projectRoot);
    frameworkAdapter = config.frameworkAdapter || 'react';
  } catch (err) {
    console.log(ui.warn(`Could not load ${configFileLabel}`, `${err.message} — using the react adapter`));
  }

// 1. Clean Build Caches & Artifacts
const foldersToClean = [".forgewp", "dist", ".vite"];
for (const folder of foldersToClean) {
  const target = path.join(projectRoot, folder);
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(ui.done("Cleared cache folder", folder));
    } catch (err) {
      console.log(ui.error(`Failed to clear ${folder}`, err.message));
    }
  }
}

// 2. Prune Scaffolded Directories (pages, blocks, components/ui, components)
const directoriesToPrune = [
  { dir: "src/app/pages", label: "Pages (src/app/pages/)" },
  { dir: "src/blocks", label: "Gutenberg Blocks (src/blocks/)" },
  { dir: "src/components/ui", label: "UI Components (src/components/ui/)" },
  { dir: "src/components", label: "Components (src/components/)" }
];

for (const targetPrune of directoriesToPrune) {
  const fullPath = path.join(projectRoot, targetPrune.dir);
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(ui.done("Removed folder", targetPrune.label));
    } catch (err) {
      console.log(ui.error(`Failed to remove ${targetPrune.label}`, err.message));
    }
  }
}

// 3. Restore Standard Database & Sitemap Menus from Core Blueprints
const coreFilesToReset = ["cms/menus.json", "cms/mock-data.json", "cms/products.json"];
for (const relPath of coreFilesToReset) {
  const scriptVariant = [".ts", ".js", ".mjs"]
    .map((ext) => relPath.replace(/\.json$/, ext))
    .find((candidate) => existsSync(path.join(projectRoot, candidate)));
  if (scriptVariant) {
    console.log(ui.info(`Kept ${relPath}`, `${scriptVariant} is the active source`));
    continue;
  }
  const fullPath = path.join(projectRoot, relPath);
  const blueprintContent = SYSTEM_BLUEPRINTS[relPath];
  if (blueprintContent) {
    try {
      const dirPath = path.dirname(fullPath);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      writeFileSync(fullPath, blueprintContent, "utf8");
      console.log(ui.done("Reset database schema", relPath));
    } catch (err) {
      console.log(ui.error(`Failed to reset ${relPath}`, err.message));
    }
  }
}

// 4. Restore Framework-Specific Canvas Blueprints via Adapter
try {
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;
  if (typeof adapter.onFresh === "function") {
    await adapter.onFresh(projectRoot);
  } else {
    console.log(ui.warn(`The ${frameworkAdapter} adapter has no starter files to restore`));
  }
} catch (err) {
  console.log(ui.error(`Could not load the ${frameworkAdapter} adapter`, err.message));
}

// 6. Automatically Trigger Monorepo CLI Template Synchronization Silently
// If running inside the monorepo starter, sync the template as well in the background!
const monorepoSyncScript = path.join(projectRoot, "..", "..", "scripts", "sync-cli-template.mjs");
if (existsSync(monorepoSyncScript)) {
  try {
    spawnSync("node", [monorepoSyncScript], {
      stdio: "ignore",
      shell: process.platform === "win32"
    });
  } catch (err) {
    // Fail silently in development background sync
  }
}

console.log("");
console.log(`  ${c.green(ui.symbols.done)} ${c.bold("Reset to a clean starter")}`);
console.log(`${ui.hint("Next", `${ui.command("pnpm dev")} ${c.dim("then edit")} ${ui.command(`src/app/page${jsxExt}`)}`)}\n`);
}

function hasWorkBeenDone() {
  const dirsToCheck = [
    "src/app/pages",
    "src/blocks",
    "src/components"
  ];
  for (const dir of dirsToCheck) {
    const fullPath = path.join(projectRoot, dir);
    if (existsSync(fullPath)) {
      try {
        const files = readdirSync(fullPath);
        if (files.length > 0) {
          return true;
        }
      } catch (e) {
        // Directory exists but failed to read or is empty
      }
    }
  }
  return false;
}

const isForce = process.argv.includes("--force") || process.argv.includes("-f") || process.argv.includes("-y");

if (hasWorkBeenDone() && !isForce) {
  if (!process.stdin.isTTY) {
    console.log(ui.errorBlock("Your project has custom pages, blocks or components.", `fresh deletes them. To confirm without a prompt, run ${ui.command("pnpm forgewp fresh --force")}`));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(ui.warn("Your project has custom pages, blocks or components"));
  console.log(ui.detail("Continuing permanently deletes them and resets the project to the starter."));

  rl.question(`\n  ${c.orange(ui.symbols.active)} Reset anyway? ${c.dim("(y/N)")} `, (answer) => {
    rl.close();
    const confirmed = answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
    if (!confirmed) {
      console.log(`\n${ui.info("Cancelled. Nothing was changed.")}\n`);
      process.exit(0);
    }
    runReset();
  });
} else {
  runReset();
}
