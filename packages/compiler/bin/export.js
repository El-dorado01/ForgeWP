#!/usr/bin/env node

import { statSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { exportTheme } from '../lib/export-theme.js';
import { findWpConfigPath } from '../lib/project-language.js';
import { createUi, formatDuration } from '../lib/terminal-ui.js';

const ui = createUi();
const { c } = ui;

function printHelp() {
  const cmd = ui.command;
  console.log(`${ui.header('export', 'package your theme for WordPress')}
  ${c.bold('Usage')}
    ${cmd('pnpm forgewp export')} ${c.dim('[options] [theme-directory]')}

  ${c.bold('Options')}
    ${cmd('--skip-build')}   Reuse the existing build output
    ${cmd('--no-zip')}       Write the theme folder only, no .zip
    ${cmd('--validate')}     Check the exported theme for missing files and assets
    ${cmd('--strict')}       Treat editable-field issues and validation warnings as errors
    ${cmd('-h, --help')}     Show this help

  ${c.bold('Examples')}
    ${cmd('pnpm forgewp export')}
    ${cmd('pnpm forgewp export --validate --strict')}
    ${cmd('pnpm forgewp export ./my-theme --skip-build')}
`);
}

function fail(message, ...details) {
  console.error(`\n${ui.error(message)}`);
  for (const detail of details) console.error(ui.detail(detail));
  console.error('');
  process.exit(1);
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

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '--skip-build') options.skipBuild = true;
    else if (arg === '--no-zip') options.zip = false;
    else if (arg === '--validate') options.validate = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg.startsWith('-')) {
      fail(`Unknown option: ${arg}`, `Run ${ui.command('pnpm forgewp export --help')} to see the available options.`);
    } else options.themeRoot = path.resolve(arg);
  }

  return options;
}

function displayPath(target) {
  const relative = path.relative(cwd(), target).replaceAll('\\', '/');
  return relative && !relative.startsWith('..') ? `./${relative}` : target;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!findWpConfigPath(options.themeRoot)) {
    fail(
      `No ForgeWP project found in ${displayPath(options.themeRoot)}`,
      'Export looks for wp.config.ts (or .js / .mjs) in the project root.',
      `Run it from your theme folder, or pass the folder: ${ui.command('pnpm forgewp export ./my-theme')}`,
    );
  }

  const startedAt = Date.now();
  console.log(ui.header('export'));
  const spin = ui.spinner();

  try {
    const result = await exportTheme({
      themeRoot: options.themeRoot,
      skipBuild: options.skipBuild,
      zip: options.zip,
      validate: options.validate,
      strict: options.strict,
      onProgress: (evt) => {
        if (evt.stage === 'fonts-done') return;
        if (evt.stage.endsWith('-done')) spin.stop(evt.message);
        else spin.start(evt.message.replace(/…$/, ''));
      },
    });
    if (spin.active) spin.stop();

    const output = result.zipPath || result.outDir;
    let size = '';
    try {
      if (result.zipPath) size = formatSize(statSync(result.zipPath).size);
    } catch {
      // size is informational only
    }
    const adapter = result.config.frameworkAdapter || 'react';
    console.log('');
    console.log(
      `  ${c.green(ui.symbols.done)} ${c.bold(`${result.config.name} exported`)}  ${c.dim(`${adapter} · ${formatDuration(Date.now() - startedAt)}`)}`,
    );
    console.log(`    ${ui.command(displayPath(output))}${size ? `  ${c.dim(size)}` : ''}`);
    if (result.zipPath) {
      console.log(ui.detail('Install it in WordPress: Appearance → Themes → Add New → Upload Theme'));
    }
    console.log('');
    for (const warning of result.warnings || []) {
      console.log(ui.warn(warning.message));
      for (const detail of warning.details || []) console.log(ui.detail(detail));
      console.log('');
    }
  } catch (error) {
    if (spin.active) spin.fail();
    const message = error instanceof Error ? error.message : String(error);
    fail(
      'Export failed',
      ...message.split(/\r?\n/).filter(Boolean),
      `Run ${ui.command('pnpm forgewp doctor')} to check the project for common problems.`,
    );
  }
}

main();
