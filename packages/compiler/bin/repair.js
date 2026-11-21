#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createUi, formatDuration } from "../lib/terminal-ui.js";

import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const ui = createUi();
const { c } = ui;

console.log(ui.header("repair", "restore missing framework files"));

const projectRoot = process.cwd();
let repairedCount = 0;

try {
  let skipBlueprints = false;
  try {
    const config = await loadConfig(projectRoot);
    const adapterModule = await loadFrameworkAdapter(config.frameworkAdapter || "react");
    const adapter = adapterModule.default || adapterModule;
    skipBlueprints = Boolean(adapter?.skipSystemBlueprints);
  } catch {
    // Fall back to default blueprint behavior if wp.config.ts is absent/unreadable
  }

  // Re-heal system blueprints for Vite-based adapters only
  if (!skipBlueprints) {
    for (const [relativePath, blueprintContent] of Object.entries(SYSTEM_BLUEPRINTS)) {
      const fullPath = path.join(projectRoot, relativePath);

      if (relativePath.startsWith("cms/") && relativePath.endsWith(".json")) {
        const tsVariant = fullPath.replace(/\.json$/, ".ts");
        if (existsSync(tsVariant)) {
          continue; // Typed .ts file exists, do not overwrite with .json blueprint
        }
      }

      // Ensure the folder exists
      const dirPath = path.dirname(fullPath);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }

      // Force overwrite to restore pure internals
      writeFileSync(fullPath, blueprintContent, "utf8");
      console.log(ui.done("Restored/Healed", relativePath));
      repairedCount++;
    }
  } else {
    console.log(ui.info("Skipped Vite framework files", "not used by this adapter"));
  }

  // Ensure default mock data table is recreated if deleted
  const mockDataTsPath = path.join(projectRoot, "cms", "mock-data.ts");
  const mockDataJsonPath = path.join(projectRoot, "cms", "mock-data.json");
  if (!existsSync(mockDataTsPath) && !existsSync(mockDataJsonPath)) {
    const defaultTs = `import { defineWpPosts } from '@forgewp/react/config';\n\nexport const mockData = defineWpPosts({\n  post: [\n    {\n      id: 1,\n      title: "Welcome to ForgeWP: The Headless Revolution",\n      excerpt: "Discover how ForgeWP bridges standard WordPress themes with React.",\n      content: "<p>Welcome to ForgeWP! Modify this in cms/mock-data.ts.</p>",\n      date: "May 10, 2026",\n      author: "Antigravity",\n      featuredImage: "https://picsum.photos/seed/forgewp/1200/630",\n      customFields: {}\n    }\n  ]\n});\n\nexport default mockData;\n`;
    const dirPath = path.dirname(mockDataTsPath);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(mockDataTsPath, defaultTs, "utf8");
    console.log(ui.done("Seeded Default Database", "cms/mock-data.ts"));
    repairedCount++;
  }

  console.log("");
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold(repairedCount ? `Restored ${repairedCount} framework file${repairedCount === 1 ? "" : "s"}` : "Nothing to repair")}  ${c.dim("your own source files were not touched")}\n`);
} catch (err) {
  console.error(ui.errorBlock("Repair failed", err.message));
  process.exit(1);
}
