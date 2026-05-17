#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const subcommands = {
  add: path.join(__dirname, "add.js"),
  "make:block": path.join(__dirname, "make-block.js"),
  export: path.join(__dirname, "export.js"),
};

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "-h" || command === "--help") {
  printHelp();
  process.exit(0);
}

let targetScript = subcommands[command];

// Helper fallback routes
if (!targetScript) {
  if (command === "make-block" || command === "make") {
    targetScript = subcommands["make:block"];
  }
}

if (!targetScript) {
  console.error(pc.red(`\n❌ Error: Unknown command "${command}"`));
  printHelp();
  process.exit(1);
}

// Forward other parameters
const commandArgs = args.slice(1);

// Run the subcommand using spawn, inheriting stdio for rich interactivity
const child = spawn(process.execPath, [targetScript, ...commandArgs], {
  stdio: "inherit",
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

function printHelp() {
  console.log(`
  ${pc.bold(pc.bgCyan(pc.black("  ⚡ FORGEWP CLI  ")))} ${pc.cyan("— Fast visual frameworks for WordPress")}

  ${pc.bold("Usage:")}
    pnpm forgewp <command> [options]

  ${pc.bold("Commands:")}
    ${pc.cyan("add <component>")}          Add registry components (e.g. navbar)
    ${pc.cyan("make:block <Name>")}        Scaffold a React Gutenberg block (e.g. HeroBlock)
    ${pc.cyan("export")}                  Package your theme into an installable WP zip

  ${pc.bold("Examples:")}
    pnpm forgewp add navbar
    pnpm forgewp add --name navbar
    pnpm forgewp make:block HeroBlock
    pnpm forgewp make:block --name HeroBlock
    pnpm forgewp export
  `);
}
