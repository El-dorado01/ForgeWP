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
    ${cmd('--verbose')}      Also list every generated template and block, and internal steps
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
    verbose: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '--skip-build') options.skipBuild = true;
    else if (arg === '--no-zip') options.zip = false;
    else if (arg === '--validate') options.validate = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--verbose') options.verbose = true;
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

/**
 * Keeps the export output short. While the export runs, lines printed by the
 * compiler (including the render process, relayed as one multi-line warn) are
 * sorted line by line:
 *   - routine progress (templates created, block shells, files written):
 *     hidden, counted for the summary; all shown with --verbose
 *   - warnings: collected and shown together after the summary
 *   - anything else: printed as before, so nothing unexpected is swallowed
 */
const ROUTINE_LINES = [
  { pattern: /^\[ForgeWP Templates\] .+ -> /, count: 'templates' },
  { pattern: /^\[Gutenberg Block Compiler\] Parent shell registered:/, count: 'block shells' },
  { pattern: /^(\[ForgeWP Compiler\] )?(WROTE|Wrote) / },
  { pattern: /^\[ForgeWP Templates\] .+: standalone export disabled/ },
];
const WARNING_LINE = /could not|deprecated|warning|not found|missing|failed|unsupported|⚠/i;

/** One routine line, shortened for --verbose: no [Prefix], project-relative paths. */
export function tidyRoutineLine(line, root = cwd()) {
  return line
    .replace(/^\[[^\]]+\]\s*/, '')
    .split(root + path.sep).join('')
    .split(root).join('.')
    .replace(/ -> /, ' → ')
    .replace(/ \(Page template;[^)]*\)/, ' (page template)')
    .replace(/ \(WordPress hierarchy;[^)]*\)/, ' (WordPress hierarchy)')
    .replace(/^WROTE /, 'wrote ')
    .replace(/^Wrote dynamic WP template /, 'wrote dynamic template ');
}

export function createExportLogFilter({ verbose = false, root = cwd(), detail = (t) => `    ${t}` } = {}) {
  const counts = {};
  const warnings = [];
  // --verbose detail waits for its step's ✓ line, then prints under it.
  const held = [];
  const originals = { log: console.log, info: console.info, warn: console.warn };
  for (const method of Object.keys(originals)) {
    console[method] = (...args) => {
      const text = args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : String(a))).join(' ');
      const passThrough = [];
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const routine = ROUTINE_LINES.find((r) => r.pattern.test(line));
        if (routine) {
          if (routine.count) counts[routine.count] = (counts[routine.count] || 0) + 1;
          if (verbose) held.push(detail(tidyRoutineLine(line, root)));
          continue;
        }
        if (WARNING_LINE.test(line)) {
          const clean = line.replace(/^\[[^\]]+\]\s*/, '');
          if (!warnings.includes(clean)) warnings.push(clean);
          continue;
        }
        passThrough.push(raw);
      }
      if (passThrough.length > 0) originals[method](passThrough.join('\n'));
    };
  }
  return {
    counts,
    warnings,
    flush: () => {
      for (const line of held.splice(0)) originals.log(line);
    },
    restore: () => Object.assign(console, originals),
  };
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
  // Installed before the spinner, which wraps console.* and prints through us.
  const logs = createExportLogFilter({ verbose: options.verbose, root: options.themeRoot, detail: (t) => ui.detail(t) });

  try {
    const result = await exportTheme({
      themeRoot: options.themeRoot,
      skipBuild: options.skipBuild,
      zip: options.zip,
      validate: options.validate,
      strict: options.strict,
      onProgress: (evt) => {
        if (evt.stage === 'fonts-done') return;
        if (evt.stage.endsWith('-done')) {
          spin.stop(evt.message);
          logs.flush();
        } else {
          if (spin.active) spin.stop();
          logs.flush();
          spin.start(evt.message.replace(/…$/, ''));
        }
      },
    });
    if (spin.active) spin.stop();
    logs.flush();
    logs.restore();

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
    const made = Object.entries(logs.counts).map(([what, n]) => `${n} ${n === 1 ? what.replace(/s$/, '') : what}`);
    if (made.length > 0 && !options.verbose) {
      console.log(ui.detail(`Generated ${made.join(' and ')}. Run with ${ui.command('--verbose')} to list them.`));
      console.log('');
    }
    if (logs.warnings.length > 0) {
      console.log(ui.warn(`${logs.warnings.length} compiler warning${logs.warnings.length === 1 ? '' : 's'} (the export still worked):`));
      for (const w of logs.warnings.slice(0, 10)) console.log(ui.detail(w));
      if (logs.warnings.length > 10) console.log(ui.detail(`…and ${logs.warnings.length - 10} more (run with --verbose)`));
      console.log('');
    }
    for (const warning of result.warnings || []) {
      console.log(ui.warn(warning.message));
      for (const detail of warning.details || []) console.log(ui.detail(detail));
      console.log('');
    }
  } catch (error) {
    if (spin.active) spin.fail();
    logs.flush();
    logs.restore();
    const message = error instanceof Error ? error.message : String(error);
    fail(
      'Export failed',
      ...message.split(/\r?\n/).filter(Boolean),
      // Earlier compiler warnings come after the error: they may or may not be related.
      ...(logs.warnings.length > 0 ? ['', `Warnings before the failure (${logs.warnings.length}):`, ...logs.warnings] : []),
      '',
      `Run ${ui.command('pnpm forgewp doctor')} to check the project for common problems.`,
    );
  }
}

main();
