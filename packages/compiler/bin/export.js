#!/usr/bin/env node

import path from 'node:path';
import { cwd } from 'node:process';
import pc from 'picocolors';
import { exportTheme } from '../lib/export-theme.js';

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

    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }

    if (arg === '--no-zip') {
      options.zip = false;
      continue;
    }

    if (arg === '--validate') {
      options.validate = true;
      continue;
    }

    if (arg === '--strict') {
      options.strict = true;
      continue;
    }

    if (arg.startsWith('-')) {
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

  const interactive = Boolean(process.stdout.isTTY);
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;
  let spinnerTimer;
  let activeStep = null;

  const drawActiveStep = () => {
    if (!activeStep || !interactive) return;
    process.stdout.write(
      `\r\x1b[2K  ${pc.cyan(spinnerFrames[spinnerIndex])} ${activeStep.message}`,
    );
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  };

  const startStep = (evt) => {
    if (activeStep) finishStep();
    activeStep = evt;
    spinnerIndex = 0;
    if (interactive) {
      drawActiveStep();
      spinnerTimer = setInterval(drawActiveStep, 90);
    } else {
      console.log(`  ${pc.cyan('⠋')} ${evt.message}`);
    }
  };

  function finishStep(message = activeStep?.message) {
    if (!activeStep) return;
    if (spinnerTimer) clearInterval(spinnerTimer);
    spinnerTimer = undefined;
    if (interactive)
      process.stdout.write(`\r\x1b[2K  ${pc.green('✓')} ${message}\n`);
    else console.log(`  ${pc.green('✓')} ${message}`);
    activeStep = null;
  }

  try {
    const result = await exportTheme({
      themeRoot: options.themeRoot,
      skipBuild: options.skipBuild,
      zip: options.zip,
      validate: options.validate,
      strict: options.strict,
      onProgress: (evt) => {
        if (evt.stage === 'fonts-done') return;
        if (evt.stage.endsWith('-done')) finishStep(evt.message);
        else startStep(evt);
      },
    });

    finishStep();
    console.log(
      pc.green(
        `  ✓ Exported ${result.config.name} → ${result.zipPath || result.outDir}`,
      ),
    );
  } catch (error) {
    if (activeStep) {
      if (spinnerTimer) clearInterval(spinnerTimer);
      if (interactive)
        process.stdout.write(
          `\r\x1b[2K  ${pc.red('✖')} ${activeStep.message}\n`,
        );
      activeStep = null;
    }
    console.error(
      pc.red(
        `\n  Export failed: ${error instanceof Error ? error.message : error}\n`,
      ),
    );
    process.exit(1);
  }
}

main();
