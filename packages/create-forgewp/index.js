#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import pc from "picocolors";
import prompts from "prompts";
import { applyProjectConfig } from "./lib/apply-config.js";
import { copyTemplate } from "./lib/copy-template.js";
import { installDependencies } from "./lib/install.js";
import {
  detectPackageManager,
  isValidProjectDirName,
  slugify,
  titleCaseFromSlug,
} from "./lib/utils.js";
import { addToPnpmWorkspace } from "./lib/workspace.js";
import { COMPONENT_REGISTRY } from "./lib/registry.js";

function printBanner() {
  console.log(`\n  ${pc.bold(pc.bgCyan(pc.black("  ⚡ FORGEWP  ")))} ${pc.cyan("— React & Tailwind CSS for WordPress")}`);
  console.log(`  ${pc.dim("Creating a lightweight, modern block-theme project scaffold.")}\n`);
}

function printHelp() {
  console.log(`
Usage:
  npx create-forgewp [project-directory] [options]
  npx create-forgewp --projectName [project-directory]

Options:
  -y, --yes           Use defaults (skip prompts)
  --no-install        Skip dependency install
  -h, --help          Show help

Examples:
  npx create-forgewp my-theme
  npx create-forgewp --projectName my-theme
  npx create-forgewp --yes
`);
}

function parseArgs(argv) {
  const args = {
    projectDir: undefined,
    yes: false,
    noInstall: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      args.help = true;
      continue;
    }

    if (arg === "-y" || arg === "--yes") {
      args.yes = true;
      continue;
    }

    if (arg === "--no-install") {
      args.noInstall = true;
      continue;
    }

    if (arg === "--projectName") {
      args.projectDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--projectName=")) {
      args.projectDir = arg.split("=")[1];
      continue;
    }

    if (arg.startsWith("-")) {
      console.error(pc.red(`Unknown option: ${arg}`));
      process.exit(1);
    }

    if (!args.projectDir) {
      args.projectDir = arg;
    }
  }

  return args;
}

async function gatherConfig(cli, defaults) {
  if (cli.yes) {
    return defaults;
  }

  const response = await prompts(
    [
      {
        type: "text",
        name: "themeName",
        message: `${pc.cyan("✔")} Theme Name`,
        initial: defaults.themeName,
        validate: (value) =>
          value.trim().length > 0 || "Theme name is required",
      },
      {
        type: cli.noInstall ? null : "confirm",
        name: "install",
        message: `${pc.cyan("✔")} Install NPM dependencies now?`,
        initial: true,
      },
      {
        type: (prev, values) =>
          !cli.noInstall && values.install ? "select" : null,
        name: "packageManager",
        message: `${pc.cyan("✔")} Choose your package manager`,
        choices: [
          { title: "pnpm", value: "pnpm" },
          { title: "npm", value: "npm" },
          { title: "yarn", value: "yarn" },
          { title: "bun", value: "bun" },
        ],
        initial: 0,
      },
    ].filter(Boolean),
    {
      onCancel: () => {
        console.log(pc.yellow("\nCancelled. ForgeWP setup aborted."));
        process.exit(0);
      },
    }
  );

  const themeName = response.themeName ?? defaults.themeName;
  const slug = slugify(themeName);

  return {
    ...defaults,
    packageName: slug,
    themeName,
    slug,
    description: `A premium block-theme built with React, Tailwind CSS, and ForgeWP.`,
    textDomain: slug,
    install: response.install ?? false,
    packageManager: response.packageManager ?? detectPackageManager(),
  };
}

async function handleAddCommand(componentName) {
  printBanner();
  
  if (!existsSync(path.join(cwd(), "wp.config.ts"))) {
    console.error(pc.red("Error: wp.config.ts not found. Please run this command inside a ForgeWP theme project."));
    process.exit(1);
  }

  let selected = componentName;
  if (!selected) {
    const response = await prompts({
      type: "select",
      name: "component",
      message: `${pc.cyan("✔")} Choose a component to add`,
      choices: Object.keys(COMPONENT_REGISTRY).map(key => ({
        title: `${key} — ${key === "navbar" ? "Dynamic site header" : key === "hero-section" ? "Premium Brutalist/Modern hero" : "Dynamic tiered pricing sheet"}`,
        value: key
      }))
    }, {
      onCancel: () => {
        console.log(pc.yellow("\nCancelled."));
        process.exit(0);
      }
    });
    selected = response.component;
  }

  const componentData = COMPONENT_REGISTRY[selected];
  if (!componentData) {
    console.error(pc.red(`Error: Component "${selected}" not found in registry.`));
    console.log(`Available components: ${Object.keys(COMPONENT_REGISTRY).join(", ")}`);
    process.exit(1);
  }

  const componentsDir = path.join(cwd(), "src", "components");
  if (!existsSync(componentsDir)) {
    mkdirSync(componentsDir, { recursive: true });
  }

  const targetFile = path.join(componentsDir, componentData.filename);
  writeFileSync(targetFile, componentData.code, "utf8");

  console.log(`\n  ${pc.bold(pc.green("🎉 Component added successfully!"))}`);
  console.log(`  ┌──────────────────────────────────────────────────────────`);
  console.log(`  │ Saved to: ${pc.cyan(path.relative(cwd(), targetFile))}`);
  console.log(`  │`);
  console.log(`  │ How to use in your src/app/page.tsx:`);
  console.log(`  │`);
  console.log(`  │ ${pc.bold("1. Import it:")}`);
  console.log(`  │    import { ${selected === "navbar" ? "Navbar" : selected === "hero-section" ? "HeroSection" : "PricingTable"} } from "@/components/${componentData.filename.replace(".tsx", "")}";`);
  console.log(`  │`);
  console.log(`  │ ${pc.bold("2. Render it:")}`);
  console.log(`  │    <${selected === "navbar" ? "Navbar" : selected === "hero-section" ? "HeroSection" : "PricingTable"} />`);
  console.log(`  └──────────────────────────────────────────────────────────\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "add") {
    await handleAddCommand(args[1]);
    return;
  }

  const cli = parseArgs(args);

  if (cli.help) {
    printHelp();
    return;
  }

  printBanner();

  let projectDirName = cli.projectDir;

  if (!projectDirName && !cli.yes) {
    const { name } = await prompts({
      type: "text",
      name: "name",
      message: `${pc.cyan("✔")} Project directory name`,
      initial: "my-forgewp-theme",
      validate: (value) =>
        isValidProjectDirName(value) || "Invalid directory name",
    });
    projectDirName = name;
  }

  if (!projectDirName) {
    projectDirName = "my-forgewp-theme";
  }

  if (!isValidProjectDirName(path.basename(projectDirName))) {
    console.error(pc.red("Invalid project directory name."));
    process.exit(1);
  }

  const targetDir = path.resolve(cwd(), projectDirName);

  if (existsSync(targetDir)) {
    console.error(pc.red(`Directory already exists: ${targetDir}`));
    process.exit(1);
  }

  const slug = slugify(path.basename(projectDirName));
  const defaults = {
    packageName: slug,
    themeName: titleCaseFromSlug(slug),
    slug,
    description: `A premium block-theme built with React, Tailwind CSS, and ForgeWP.`,
    textDomain: slug,
    version: "0.1.0",
    install: !cli.noInstall,
    packageManager: detectPackageManager(),
  };

  const config = await gatherConfig(cli, defaults);

  console.log(`\n  ${pc.cyan("⚙ Configuring scaffold...")}`);
  console.log(`  ${pc.dim("Target Folder")}  ${pc.bold(targetDir)}`);

  copyTemplate(targetDir);
  applyProjectConfig(targetDir, config);

  if (config.packageManager === "pnpm") {
    addToPnpmWorkspace(targetDir);
  }

  if (config.install) {
    console.log(`  ${pc.cyan(`📦 Installing packages using ${pc.bold(config.packageManager)}...`)}\n`);
    installDependencies(targetDir, config.packageManager);
  }

  const pm = config.packageManager;
  const run = (script) => {
    switch (pm) {
      case "pnpm":
        return `pnpm ${script}`;
      case "yarn":
        return `yarn ${script}`;
      case "bun":
        return `bun run ${script}`;
      default:
        return `npm run ${script}`;
    }
  };

  console.log(`\n  ${pc.bold(pc.green("🎉 Project scaffolded successfully!"))}\n`);
  console.log(`  ${pc.bold("Next steps to start building your WordPress theme:")}`);
  console.log(`  ┌──────────────────────────────────────────────────────────`);
  console.log(`  │ 1. Navigate to your project folder:`);
  console.log(`  │    ${pc.cyan(`cd ${path.relative(cwd(), targetDir) || "."}`)}`);
  
  if (!config.install) {
    console.log(`  │ 2. Install dependencies:`);
    console.log(`  │    ${pc.cyan(`${pm} install`)}`);
  }
  
  const stepNum = config.install ? "2" : "3";
  const stepNumPlus = config.install ? "3" : "4";
  const stepNumBuild = config.install ? "4" : "5";

  console.log(`  │ ${stepNum}. Run the interactive Vite local developer server:`);
  console.log(`  │    ${pc.cyan(run("dev"))}`);
  console.log(`  │`);
  console.log(`  │ ${stepNumPlus}. Edit code inside src/ and design presets inside wp.config.ts.`);
  console.log(`  │`);
  console.log(`  │ ${stepNumBuild}. Export theme to WordPress (.zip):`);
  console.log(`  │    ${pc.cyan(run("build"))}`);
  console.log(`  │`);
  console.log(`  │ ${pc.yellow("💡 Tip:")} You can customize your layout boundaries, color palette,`);
  console.log(`  │      and Next.js-style Google Fonts anytime in ${pc.bold("wp.config.ts")}!`);
  console.log(`  └──────────────────────────────────────────────────────────\n`);
}

main().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
