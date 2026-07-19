#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const subcommands = {
  add: path.join(__dirname, "add.js"),
  "make:block": path.join(__dirname, "make-block.js"),
  "make:shell": path.join(__dirname, "make-shell.js"),
  "make:post-type": path.join(__dirname, "make-post-type.js"),
  "make:loop": path.join(__dirname, "make-loop.js"),
  "make:page": path.join(__dirname, "make-page.js"),
  "make:island": path.join(__dirname, "make-island.js"),
  "make:editable": path.join(__dirname, "make-editable.js"),
  "make:form": path.join(__dirname, "make-form.js"),
  "make:sandbox": path.join(__dirname, "make-sandbox.js"),
  "sync:routes": path.join(__dirname, "sync-routes.js"),
  "sync:hooks": path.join(__dirname, "sync-hooks.js"),
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
  } else if (command === "make-shell" || command === "make:shell" || command === "shell") {
    targetScript = subcommands["make:shell"];
  } else if (command === "make-post-type" || command === "post-type" || command === "make:post-type") {
    targetScript = subcommands["make:post-type"];
  } else if (command === "make-loop" || command === "loop" || command === "make:loop") {
    targetScript = subcommands["make:loop"];
  } else if (command === "make-page" || command === "page" || command === "make:page") {
    targetScript = subcommands["make:page"];
  } else if (command === "make-island" || command === "island" || command === "make:island") {
    targetScript = subcommands["make:island"];
  } else if (command === "make-editable" || command === "editable" || command === "make:editable") {
    targetScript = subcommands["make:editable"];
  } else if (command === "make-form" || command === "form" || command === "make:form") {
    targetScript = subcommands["make:form"];
  } else if (command === "make-sandbox" || command === "sandbox" || command === "make:sandbox") {
    targetScript = subcommands["make:sandbox"];
  } else if (command === "sync-routes" || command === "sync" || command === "sync:routes") {
    targetScript = subcommands["sync:routes"];
  } else if (command === "sync-hooks" || command === "sync:hooks") {
    targetScript = subcommands["sync:hooks"];
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
    ${pc.cyan("make:shell <Name>")}        Scaffold a parent shell (InnerBlocks layout + children)
    ${pc.cyan("make:post-type <slug>")}    Register a custom mock post-type (e.g. portfolio)
    ${pc.cyan("make:loop <Name>")}         Scaffold a custom post-type loop feed component
    ${pc.cyan("make:page <Name>")}         Scaffold a custom WordPress Page Template
    ${pc.cyan("make:island <Name>")}       Scaffold an interactive selective hydration island
    ${pc.cyan("make:editable <Name>")}     Scaffold a colocated editable content schema (cms/editables/)
    ${pc.cyan("make:form <Name>")}         Scaffold a form (cms/forms/) + starter component (src/components/forms/)
    ${pc.cyan("make:sandbox <type>")}         Scaffold sandbox mock databases (e.g. ecommerce, auth)
    ${pc.cyan("sync:routes")}             Synchronize sitemap menus with routes and scaffold pages
    ${pc.cyan("sync:hooks")}              Propagate wordpress.tsx hooks to all workspace projects
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
    pnpm forgewp make:shell AboutSplitSection --children=about-mission,about-values --layout=2-col
    pnpm forgewp make:post-type portfolio --customFields=client_name
    pnpm forgewp make:sandbox ecommerce
    pnpm forgewp make:sandbox auth
    pnpm forgewp make:loop PortfolioGrid --postType=portfolio
    pnpm forgewp make:page AboutUs
    pnpm forgewp make:island CounterIsland
    pnpm forgewp make:editable AboutPage --fields=hero_badge:text,hero_title:text,hero_subtitle:richText
    pnpm forgewp make:form Contact --fields=name:text,email:email,message:textarea
    pnpm forgewp sync:routes
    pnpm forgewp doctor
    pnpm forgewp analyze
    pnpm forgewp repair
    pnpm forgewp clean
    pnpm forgewp fresh
    pnpm forgewp export
  `);
}
