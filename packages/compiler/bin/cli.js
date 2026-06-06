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
  "make:template": path.join(__dirname, "make-template.js"),
  "make:component": path.join(__dirname, "make-template.js"), // Backward compatible alias mapping
  "make:island": path.join(__dirname, "make-island.js"),
  "sync:routes": path.join(__dirname, "sync-routes.js"),
  "i18n:extract": path.join(__dirname, "i18n-extract.js"),
  "i18n:translate": path.join(__dirname, "i18n-translate.js"),
  export: path.join(__dirname, "export.js"),
  doctor: path.join(__dirname, "doctor.js"),
  analyze: path.join(__dirname, "analyze.js"),
  repair: path.join(__dirname, "repair.js"),
  clean: path.join(__dirname, "clean.js"),
  fresh: path.join(__dirname, "fresh.js"),
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
  } else if (command === "make-template" || command === "template" || command === "make:template") {
    targetScript = subcommands["make:template"];
  } else if (command === "make-component" || command === "component" || command === "make:component") {
    targetScript = subcommands["make:component"];
  } else if (command === "make-island" || command === "island" || command === "make:island") {
    targetScript = subcommands["make:island"];
  } else if (command === "sync-routes" || command === "sync" || command === "sync:routes") {
    targetScript = subcommands["sync:routes"];
  } else if (command === "i18n-extract" || command === "i18n:extract") {
    targetScript = subcommands["i18n:extract"];
  } else if (command === "i18n-translate" || command === "i18n:translate") {
    targetScript = subcommands["i18n:translate"];
  } else if (command === "reset") {
    targetScript = subcommands["fresh"];
  } else if (command === "inspect" || command === "analyze") {
    targetScript = subcommands["analyze"];
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
  env: {
    ...process.env,
    FORGEWP_LEGACY_ALIAS: (command === "make:component" || command === "make-component" || command === "component") ? "1" : "0",
  },
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
    ${pc.cyan("make:block <Name>")}        Scaffold a type-safe Gutenberg Block via defineBlock()
    ${pc.cyan("make:post-type <slug>")}    Register a custom mock post-type (e.g. portfolio)
    ${pc.cyan("make:template <Name>")}     Scaffold a custom post-type loop template
    ${pc.cyan("make:island <Name>")}       Scaffold an interactive selective hydration island
    ${pc.cyan("sync:routes")}             Synchronize sitemap menus with routes and scaffold pages
    ${pc.cyan("i18n:extract")}            Extract translation strings to translations.json
    ${pc.cyan("i18n:translate")}          Translate missing strings via the configured engine
    ${pc.cyan("export")}                  Package your theme into an installable WP zip
    ${pc.cyan("doctor")}                  Perform diagnostic check on project health
    ${pc.cyan("analyze")}                 Generate visual hydration island & size report
    ${pc.cyan("repair")}                  Force-repair/auto-heal system internals
    ${pc.cyan("clean")}                   Clear all build caches and temporary artifacts
    ${pc.cyan("fresh")}                   Reset workspace completely to factory-clean canvas

  ${pc.bold("Examples:")}
    pnpm forgewp add navbar
    pnpm forgewp make:block HeroBlock --attributes=title,subtitle
    pnpm forgewp make:post-type portfolio --customFields=client_name
    pnpm forgewp make:template PortfolioGrid --postType=portfolio
    pnpm forgewp make:island CounterIsland
    pnpm forgewp sync:routes
    pnpm forgewp doctor
    pnpm forgewp analyze
    pnpm forgewp repair
    pnpm forgewp clean
    pnpm forgewp fresh
    pnpm forgewp export
  `);
}
