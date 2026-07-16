#!/usr/bin/env node

import path from "node:path";
import { cwd } from "node:process";
import pc from "picocolors";
import { exportTheme } from "../lib/export-theme.js";

function printHelp() {
  console.log(`
Usage: forgewp-export [options] [theme-directory]

Options:
  --skip-build    Use existing dist/ (skip Vite build)
  --no-zip        Output folder only, no ZIP file
  --validate      Run export validation checks after generation
  --strict        Fail on editable from/pick issues and (with --validate) validation warnings
  -h, --help      Show help

Examples:
  forgewp-export
  forgewp-export ./my-theme
  forgewp-export --skip-build
  forgewp-export --strict
  forgewp-export --validate --strict
`);
}

function parseArgs(argv) {
  const options = {
    themeRoot: cwd(),
    skipBuild: false,
    zip: true,
    validate: false,
    strict: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }

    if (arg === "--no-zip") {
      options.zip = false;
      continue;
    }

    if (arg === "--validate") {
      options.validate = true;
      continue;
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg.startsWith("-")) {
      console.error(pc.red(`Unknown option: ${arg}`));
      process.exit(1);
    }

    options.themeRoot = path.resolve(arg);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  try {
    const result = await exportTheme({
      themeRoot: options.themeRoot,
      skipBuild: options.skipBuild,
      zip: options.zip,
      validate: options.validate,
      strict: options.strict,
      onProgress: (evt) => {
        // Minimal CLI progress line (stage label)
        console.log(pc.dim(`  [${evt.stage}] ${evt.message}`));
      },
    });

    console.log(pc.green("\n  Export complete\n"));
    console.log(`  ${pc.dim("Theme folder")}  ${result.outDir}`);
    if (result.zipPath) {
      console.log(`  ${pc.dim("ZIP")}           ${result.zipPath}`);
    }
    console.log(
      `\n  ${pc.dim("Install:")} Upload the ZIP to Appearance → Themes → Add New\n`,
    );
  } catch (error) {
    console.error(pc.red(`\n  Export failed: ${error instanceof Error ? error.message : error}\n`));
    process.exit(1);
  }
}

main();
