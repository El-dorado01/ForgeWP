#!/usr/bin/env node

import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";

console.log(`\n🧹 ${pc.bold(pc.bgMagenta(pc.black("  FORGEWP CACHE CLEANER  ")))}\n`);

const projectRoot = process.cwd();
const foldersToClean = [
  ".forgewp",
  "dist",
  ".vite"
];

let cleanedCount = 0;

for (const folder of foldersToClean) {
  const target = path.join(projectRoot, folder);
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(`  ${pc.green("✅ Cleared folder")}: ${pc.cyan(folder)}`);
      cleanedCount++;
    } catch (err) {
      console.log(pc.red(`  ❌ Failed to clear ${folder}: ${err.message}`));
    }
  }
}

console.log("\n" + "─".repeat(60));
if (cleanedCount > 0) {
  console.log(pc.green(`\n🎉 ${pc.bold("CLEAN COMPLETE:")} Pruned ${cleanedCount} build artifact/cache folders.`));
  console.log(pc.cyan("   Your development workspace is now 100% clean and fresh.\n"));
} else {
  console.log(pc.yellow(`\n⚠️  ${pc.bold("NO ACTION NEEDED:")} No cached build folders or artifacts found. Workspace is already clean!\n`));
}
