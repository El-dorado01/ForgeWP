#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);
let rawIslandName = args.find(a => !a.startsWith("-"));

// Support --name CounterIsland or --name=CounterIsland
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawIslandName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawIslandName = nameEqual.split("=")[1];
  }
}

// Only ask when someone is at the keyboard; otherwise fall through to the missing-name error.
if (!rawIslandName && process.stdin.isTTY) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`  ${c.orange(ui.symbols.active)} Enter an island name: `);
    rawIslandName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawIslandName) {
  console.error(ui.errorBlock("Missing island name.", `Example: ${ui.command("pnpm forgewp make:island CounterIsland")}`));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawIslandName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(ui.errorBlock("Invalid island name.", "Use letters, numbers, dashes and underscores."));
  process.exit(1);
}

const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(ui.errorBlock("No src/ folder here.", "Run this from your theme project root."));
  process.exit(1);
}

// Load configuration and invoke adapter
let frameworkAdapter = "react";
try {
  const config = await loadConfig(projectRoot);
  frameworkAdapter = config.frameworkAdapter || "react";
} catch (err) {
  // Use default
}

try {
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;
  if (typeof adapter.onMakeIsland === "function") {
    await adapter.onMakeIsland(projectRoot, {
      pascalCase,
      pc: c
    });
  } else {
    console.error(ui.errorBlock(`The ${frameworkAdapter} adapter does not support make:island.`));
    process.exit(1);
  }
} catch (err) {
  console.error(ui.errorBlock("make:island failed", err.message));
  process.exit(1);
}
