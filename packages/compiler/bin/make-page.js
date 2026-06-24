#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const args = process.argv.slice(2);
let rawPageName = args.find(a => !a.startsWith("-"));

// Support --name AboutUs or --name=AboutUs
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawPageName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawPageName = nameEqual.split("=")[1];
  }
}

if (!rawPageName) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(pc.cyan("? Enter a page name: "));
    rawPageName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawPageName) {
  console.error(pc.red("\n❌ Error: Please specify a page name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:page AboutUs"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:page --name AboutUs\n"));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawPageName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(pc.red("\n❌ Error: Invalid page name.\n"));
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
  if (typeof adapter.onMakePage === "function") {
    await adapter.onMakePage(projectRoot, {
      pascalCase,
      pc
    });
  } else {
    console.error(pc.red(`\n❌ Error: Framework adapter "${frameworkAdapter}" does not support making custom page templates.`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute make:page: ${err.message}`));
  process.exit(1);
}
