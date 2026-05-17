#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";

console.log(`\n🔧 ${pc.bold(pc.bgYellow(pc.black("  FORGEWP SYSTEM REPAIR TOOL  ")))}\n`);

const projectRoot = process.cwd();
let repairedCount = 0;

try {
  // Re-heal every system blueprint
  for (const [relativePath, blueprintContent] of Object.entries(SYSTEM_BLUEPRINTS)) {
    const fullPath = path.join(projectRoot, relativePath);

    // Ensure the folder exists
    const dirPath = path.dirname(fullPath);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Force overwrite to restore pure internals
    writeFileSync(fullPath, blueprintContent, "utf8");
    console.log(`  ${pc.green("✅ Restored/Healed")}: ${pc.cyan(relativePath)}`);
    repairedCount++;
  }

  // Ensure default mock data table is recreated if deleted
  const mockDataPath = path.join(projectRoot, "wordpress", "mock-data.json");
  if (!existsSync(mockDataPath)) {
    const defaultJson = {
      post: [
        {
          id: 1,
          title: "Welcome to ForgeWP: The Headless Revolution",
          excerpt: "Discover how ForgeWP bridges standard WordPress themes with React.",
          content: "<p>Welcome to ForgeWP! Modify this in mock-data.json.</p>",
          date: "May 10, 2026",
          author: "Antigravity",
          featuredImage: "https://picsum.photos/seed/forgewp/1200/630",
          customFields: {}
        }
      ]
    };
    const dirPath = path.dirname(mockDataPath);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(mockDataPath, JSON.stringify(defaultJson, null, 2), "utf8");
    console.log(`  ${pc.green("✅ Seeded Default Database")}: wordpress/mock-data.json`);
    repairedCount++;
  }

  console.log("\n" + "─".repeat(60));
  console.log(pc.green(`\n🎉 ${pc.bold("REPAIR COMPLETE:")} Successfully repaired/synced ${repairedCount} core framework elements.`));
  console.log(pc.cyan("   All protected boundaries have been restored back to defaults. Build safe!\n"));
} catch (err) {
  console.error(pc.red(`\n❌ Error: Failed to perform system repair.\nReason: ${err.message}\n`));
  process.exit(1);
}
