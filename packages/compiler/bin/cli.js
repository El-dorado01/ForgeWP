#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const subcommands = {
  add: path.join(__dirname, "add.js"),
  "make:block": path.join(__dirname, "make-block.js"),
  "make:post-type": path.join(__dirname, "make-post-type.js"),
  "make:component": path.join(__dirname, "make-component.js"),
  "sync:routes": path.join(__dirname, "sync-routes.js"),
  export: path.join(__dirname, "export.js"),
  doctor: path.join(__dirname, "doctor.js"),
  repair: path.join(__dirname, "repair.js"),
  clean: path.join(__dirname, "clean.js"),
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
  } else if (command === "make-post-type" || command === "post-type" || command === "make:post-type") {
    targetScript = subcommands["make:post-type"];
  } else if (command === "make-component" || command === "component" || command === "make:component") {
    targetScript = subcommands["make:component"];
  } else if (command === "sync-routes" || command === "sync" || command === "sync:routes") {
    targetScript = subcommands["sync:routes"];
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
    ${pc.cyan("make:post-type <slug>")}    Register a custom mock post-type (e.g. portfolio)
    ${pc.cyan("make:component <Name>")}    Scaffold a post-type grid loop component
    ${pc.cyan("sync:routes")}             Synchronize sitemap menus with routes and scaffold pages
    ${pc.cyan("export")}                  Package your theme into an installable WP zip
    ${pc.cyan("doctor")}                  Perform diagnostic check on project health
    ${pc.cyan("repair")}                  Force-repair/auto-heal system internals
    ${pc.cyan("clean")}                   Clear all build caches and temporary artifacts

  ${pc.bold("Examples:")}
    pnpm forgewp add navbar
    pnpm forgewp make:block HeroBlock --attributes=title,subtitle
    pnpm forgewp make:post-type portfolio --customFields=client_name
    pnpm forgewp make:component PortfolioGrid --postType=portfolio
    pnpm forgewp sync:routes
    pnpm forgewp doctor
    pnpm forgewp repair
    pnpm forgewp clean
    pnpm forgewp export
  `);
}
