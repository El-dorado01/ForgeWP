#!/usr/bin/env node

import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import { createUi, formatDuration } from "../lib/terminal-ui.js";

const ui = createUi();
const { c } = ui;

console.log(ui.header("clean", "build caches and temporary files"));

const projectRoot = process.cwd();
const foldersToClean = [
  ".forgewp",
  "dist",
  ".vite",
  ".next",
  "out"
];

let cleanedCount = 0;

for (const folder of foldersToClean) {
  const target = path.join(projectRoot, folder);
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(ui.done("Cleared folder", folder));
      cleanedCount++;
    } catch (err) {
      console.log(ui.error(`Failed to clear ${folder}`, err.message));
    }
  }
}

console.log("");
if (cleanedCount > 0) {
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold(`Cleaned ${cleanedCount} folder${cleanedCount === 1 ? "" : "s"}`)}\n`);
} else {
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold("Already clean")}  ${c.dim("no caches or build output found")}\n`);
}
