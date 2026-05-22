#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

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

if (!rawIslandName) {
  console.error(pc.red("\n❌ Error: Please specify an island name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:island CounterIsland"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:island --name CounterIsland\n"));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawIslandName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(pc.red("\n❌ Error: Invalid island name.\n"));
  process.exit(1);
}

const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
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
      pc
    });
  } else {
    console.error(pc.red(`\n❌ Error: Framework adapter "${frameworkAdapter}" does not support making interactive hydration islands.`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute make:island: ${err.message}`));
  process.exit(1);
}
