#!/usr/bin/env node

import { existsSync } from "node:fs";
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

function printHelp() {
  console.log(`
Usage:
  npm init @forgewp [project-directory] [options]

Options:
  -y, --yes           Use defaults (skip prompts)
  --no-install        Skip dependency install
  -h, --help          Show help

Examples:
  npm init @forgewp my-theme
  pnpm create @forgewp ./sites/acme --yes
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
        message: "WordPress theme name",
        initial: defaults.themeName,
        validate: (value) =>
          value.trim().length > 0 || "Theme name is required",
      },
      {
        type: "text",
        name: "slug",
        message: "Theme slug (folder name in wp-content/themes)",
        initial: defaults.slug,
        validate: (value) =>
          /^[a-z0-9-]+$/.test(value) ||
          "Use lowercase letters, numbers, and hyphens only",
      },
      {
        type: "text",
        name: "description",
        message: "Theme description",
        initial: defaults.description,
      },
      {
        type: "text",
        name: "textDomain",
        message: "Text domain (for translations)",
        initial: defaults.textDomain,
      },
      {
        type: cli.noInstall ? null : "confirm",
        name: "install",
        message: "Install dependencies now?",
        initial: true,
      },
      {
        type: (prev, values) =>
          !cli.noInstall && values.install ? "select" : null,
        name: "packageManager",
        message: "Package manager",
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
        console.log(pc.yellow("\nCancelled."));
        process.exit(0);
      },
    },
  );

  const slug = response.slug ?? defaults.slug;

  return {
    ...defaults,
    packageName: slug,
    themeName: response.themeName ?? defaults.themeName,
    slug,
    description: response.description ?? defaults.description,
    textDomain: response.textDomain ?? defaults.textDomain,
    install: response.install ?? false,
    packageManager: response.packageManager ?? detectPackageManager(),
  };
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.help) {
    printHelp();
    return;
  }

  let projectDirName = cli.projectDir;

  if (!projectDirName && !cli.yes) {
    const { name } = await prompts({
      type: "text",
      name: "name",
      message: "Project directory name",
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
    description: `A ForgeWP theme: ${titleCaseFromSlug(slug)}`,
    textDomain: slug,
    version: "0.1.0",
    install: !cli.noInstall,
    packageManager: detectPackageManager(),
  };

  const config = await gatherConfig(cli, defaults);

  console.log(pc.cyan("\n  @forgewp/create\n"));
  console.log(`  ${pc.dim("target")}  ${targetDir}\n`);

  copyTemplate(targetDir);
  applyProjectConfig(targetDir, config);

  if (config.packageManager === "pnpm") {
    addToPnpmWorkspace(targetDir);
  }

  if (config.install) {
    console.log(pc.dim(`\nInstalling with ${config.packageManager}...\n`));
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

  console.log(pc.green("Done.\n"));
  console.log("  Next steps:\n");
  console.log(`  ${pc.cyan(`cd ${path.relative(cwd(), targetDir) || "."}`)}`);
  if (!config.install) {
    console.log(`  ${pc.cyan(`${pm} install`)}`);
  }
  console.log(`  ${pc.cyan(run("dev"))}`);
  console.log(`  ${pc.cyan(run("typecheck"))}`);
  console.log(`  ${pc.cyan(run("build"))}\n`);
  console.log(
    pc.dim("  Edit wp.config.ts and src/ — export to WordPress comes in Step 2.\n"),
  );
}

main().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
