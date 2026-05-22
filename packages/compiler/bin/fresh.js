#!/usr/bin/env node

import { rmSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import pc from "picocolors";
import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

console.log(`\n🧹 ${pc.bold(pc.bgRed(pc.black("  FORGEWP FACTORY RESET (FRESH CANVAS)  ")))}\n`);

const projectRoot = process.cwd();

async function runReset() {
  // Load the project config to determine the framework adapter
  let frameworkAdapter = 'react';
  try {
    const config = await loadConfig(projectRoot);
    frameworkAdapter = config.frameworkAdapter || 'react';
  } catch (err) {
    console.log(pc.yellow(`  ⚠️  Could not load wp.config.ts. Using default adapter: react`));
  }

// 1. Clean Build Caches & Artifacts
const foldersToClean = [".forgewp", "dist", ".vite"];
for (const folder of foldersToClean) {
  const target = path.join(projectRoot, folder);
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(`  ${pc.green("✅ Cleared cache folder")}: ${pc.cyan(folder)}`);
    } catch (err) {
      console.log(pc.red(`  ❌ Failed to clear ${folder}: ${err.message}`));
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
      console.log(`  ${pc.green("✅ Removed folder")}: ${pc.cyan(targetPrune.label)}`);
    } catch (err) {
      console.log(pc.red(`  ❌ Failed to remove ${targetPrune.label}: ${err.message}`));
    }
  }
}

// 3. Restore Standard Database & Sitemap Menus from Core Blueprints
const coreFilesToReset = ["cms/menus.json", "cms/mock-data.json"];
for (const relPath of coreFilesToReset) {
  const fullPath = path.join(projectRoot, relPath);
  const blueprintContent = SYSTEM_BLUEPRINTS[relPath];
  if (blueprintContent) {
    try {
      const dirPath = path.dirname(fullPath);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      writeFileSync(fullPath, blueprintContent, "utf8");
      console.log(`  ${pc.green("✅ Reset database schema")}: ${pc.cyan(relPath)}`);
    } catch (err) {
      console.log(pc.red(`  ❌ Failed to reset ${relPath}: ${err.message}`));
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
    console.log(`  ${pc.yellow("⚠️  No fresh canvas hook implemented for framework adapter:")} ${pc.cyan(frameworkAdapter)}`);
  }
} catch (err) {
  console.log(pc.red(`  ❌ Failed to load framework adapter "${frameworkAdapter}": ${err.message}`));
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

console.log("\n" + "─".repeat(60));
console.log(pc.green(`\n🎉 ${pc.bold("CANVAS RESET COMPLETE:")} Reverted workspace back to standard empty blueprints.`));
console.log(pc.cyan(`   Your ForgeWP canvas is now factory-fresh, clean, and perfectly synced.`));
console.log(`\n🚀 ${pc.bold("NEXT STEPS:")}`);
console.log(`   1. Start the Vite Dev Server:    ${pc.cyan("pnpm dev")} or ${pc.cyan("npm run dev")}`);
console.log(`   2. Add dynamic UI components:    ${pc.cyan("pnpm forgewp add fade-reveal")}`);
console.log(`   3. Customize your entry page:    ${pc.cyan("src/app/page.tsx")}`);
console.log(`   4. Compile to WordPress theme:  ${pc.cyan("pnpm export")} or ${pc.cyan("npm run export")}\n`);
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
    console.log(pc.red(`❌ Non-interactive environment detected. Please use the --force flag to reset active work.`));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(pc.yellow(`⚠️  ${pc.bold("WARNING:")} Existing custom pages, blocks, or components detected in your canvas!`));
  console.log(pc.yellow(`   Continuing will permanently delete all custom work and reset back to factory default.`));

  rl.question(`\n   Are you sure you want to proceed? (y/N): `, (answer) => {
    rl.close();
    const confirmed = answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
    if (!confirmed) {
      console.log(pc.blue(`\n❌ Reset aborted. No changes were made.\n`));
      process.exit(0);
    }
    runReset();
  });
} else {
  runReset();
}
