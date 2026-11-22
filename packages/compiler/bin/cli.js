#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { blockAuthoringHelp } from '../lib/block-authoring-help.js';
import { isSupportedNode, SUPPORTED_NODE_RANGE } from '../lib/node-runtime.js';
import { createUi } from '../lib/terminal-ui.js';

const ui = createUi();
const { c } = ui;

if (!isSupportedNode()) {
  console.error(`\n${ui.error(`ForgeWP needs Node.js ${SUPPORTED_NODE_RANGE}`, `found ${process.version}`)}`);
  console.error(`${ui.detail('Install a supported Node.js version (https://nodejs.org) and run the command again.')}\n`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const subcommands = {
  init: path.join(__dirname, 'init.js'),
  add: path.join(__dirname, 'add.js'),
  'make:block': path.join(__dirname, 'make-block.js'),
  'make:section': path.join(__dirname, 'make-section.js'),
  'make:shell': path.join(__dirname, 'make-shell.js'),
  'make:post-type': path.join(__dirname, 'make-post-type.js'),
  'make:loop': path.join(__dirname, 'make-loop.js'),
  'make:page': path.join(__dirname, 'make-page.js'),
  'make:island': path.join(__dirname, 'make-island.js'),
  'make:editable': path.join(__dirname, 'make-editable.js'),
  'make:mail': path.join(__dirname, 'make-mail.js'),
  'make:form': path.join(__dirname, 'make-form.js'),
  'make:sandbox': path.join(__dirname, 'make-sandbox.js'),
  'sync:routes': path.join(__dirname, 'sync-routes.js'),
  'sync:hooks': path.join(__dirname, 'sync-hooks.js'),
  seed: path.join(__dirname, 'seed.js'),
  'seed:products': path.join(__dirname, 'seed.js'),
  'seed:mock-data': path.join(__dirname, 'seed.js'),
  'i18n:extract': path.join(__dirname, 'i18n-extract.js'),
  'i18n:translate': path.join(__dirname, 'i18n-translate.js'),
  export: path.join(__dirname, 'export.js'),
  doctor: path.join(__dirname, 'doctor.js'),
  analyze: path.join(__dirname, 'analyze.js'),
  repair: path.join(__dirname, 'repair.js'),
  clean: path.join(__dirname, 'clean.js'),
  fresh: path.join(__dirname, 'fresh.js'),
};

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '-h' || command === '--help') {
  printHelp();
  process.exit(0);
}

let targetScript = subcommands[command];

// Helper fallback routes
if (!targetScript) {
  if (command === 'make-block' || command === 'make') {
    targetScript = subcommands['make:block'];
  } else if (
    command === 'make-section' ||
    command === 'section' ||
    command === 'make:section'
  ) {
    targetScript = subcommands['make:section'];
  } else if (
    command === 'make-shell' ||
    command === 'make:shell' ||
    command === 'shell'
  ) {
    targetScript = subcommands['make:shell'];
  } else if (
    command === 'make-post-type' ||
    command === 'post-type' ||
    command === 'make:post-type'
  ) {
    targetScript = subcommands['make:post-type'];
  } else if (
    command === 'make-loop' ||
    command === 'loop' ||
    command === 'make:loop'
  ) {
    targetScript = subcommands['make:loop'];
  } else if (
    command === 'make-page' ||
    command === 'page' ||
    command === 'make:page'
  ) {
    targetScript = subcommands['make:page'];
  } else if (
    command === 'make-island' ||
    command === 'island' ||
    command === 'make:island'
  ) {
    targetScript = subcommands['make:island'];
  } else if (
    command === 'make-editable' ||
    command === 'editable' ||
    command === 'make:editable'
  ) {
    targetScript = subcommands['make:editable'];
  } else if (
    command === 'make-form' ||
    command === 'form' ||
    command === 'make:form'
  ) {
    targetScript = subcommands['make:form'];
  } else if (
    command === 'make-sandbox' ||
    command === 'sandbox' ||
    command === 'make:sandbox'
  ) {
    targetScript = subcommands['make:sandbox'];
  } else if (
    command === 'sync-routes' ||
    command === 'sync' ||
    command === 'sync:routes'
  ) {
    targetScript = subcommands['sync:routes'];
  } else if (command === 'sync-hooks' || command === 'sync:hooks') {
    targetScript = subcommands['sync:hooks'];
  } else if (command === 'i18n-extract' || command === 'i18n:extract') {
    targetScript = subcommands['i18n:extract'];
  } else if (command === 'i18n-translate' || command === 'i18n:translate') {
    targetScript = subcommands['i18n:translate'];
  } else if (command === 'reset') {
    targetScript = subcommands['fresh'];
  } else if (command === 'inspect' || command === 'analyze') {
    targetScript = subcommands['analyze'];
  }
}

if (!targetScript) {
  const suggestion = closestCommand(command, Object.keys(subcommands));
  console.error(`\n${ui.error(`Unknown command: ${command}`)}`);
  if (suggestion) console.error(ui.detail(`Did you mean ${ui.command(`pnpm forgewp ${suggestion}`)}?`));
  console.error(`${ui.detail(`Run ${ui.command('pnpm forgewp --help')} to see every command.`)}\n`);
  process.exit(1);
}

// Forward other parameters
const commandArgs = args.slice(1);

// Run the subcommand using spawn, inheriting stdio for rich interactivity
const child = spawn(process.execPath, [targetScript, ...commandArgs], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

/** Nearest command by edit distance, or null when nothing is close. */
function closestCommand(input, commands) {
  const distance = (a, b) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  };
  let best = null;
  for (const candidate of commands) {
    const d = distance(input.toLowerCase(), candidate);
    if (d <= Math.max(2, Math.floor(candidate.length / 3)) && (!best || d < best.d)) best = { candidate, d };
  }
  return best?.candidate ?? null;
}

function printHelp() {
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  const groups = [
    ['Create', [
      ['init', 'Add ForgeWP to an existing Next.js app (--dry-run to preview)'],
      ['add <component>', 'Add a ready-made component (--overwrite to replace)'],
      ['make:block <Name>', 'Gutenberg block with defineBlock()'],
      ['make:section <Name>', 'Shared editable page or block section'],
      ['make:shell <Name>', 'Layout parent with InnerBlocks children'],
      ['make:page <Name>', 'WordPress page template'],
      ['make:island <Name>', 'Interactive hydration island'],
      ['make:loop <Name>', 'Post-type loop feed component'],
      ['make:post-type <slug>', 'Custom post type with mock data'],
      ['make:editable <Name>', 'Editable content schema (cms/editables/)'],
      ['make:form <Name>', 'Native form plus starter component'],
      ['make:mail <name>', 'Plain-text email template (cms/mail/)'],
      ['make:sandbox <type>', 'Sandbox mock data (ecommerce, auth)'],
    ]],
    ['Build & ship', [
      ['export', 'Package the theme as an installable WordPress zip'],
      ['analyze', 'Hydration island and bundle size report'],
    ]],
    ['Content & data', [
      ['sync:routes', 'Sync menus with routes and scaffold pages'],
      ['sync:hooks', 'Propagate wordpress.tsx hooks to workspace projects'],
      ['seed', 'Inspect fixtures and configure WordPress seeding'],
      ['i18n:extract', 'Extract translation strings'],
      ['i18n:translate', 'Translate missing strings'],
    ]],
    ['Maintenance', [
      ['doctor', 'Check project health'],
      ['repair', 'Restore missing framework files'],
      ['clean', 'Clear build caches and temporary files'],
      ['fresh', 'Reset the project to a clean starter'],
    ]],
  ];
  const width = Math.max(...groups.flatMap(([, rows]) => rows.map(([name]) => name.length)));
  const sections = groups
    .map(
      ([title, rows]) =>
        `  ${c.bold(title)}\n${rows.map(([name, text]) => `    ${ui.command(name.padEnd(width))}   ${c.dim(text)}`).join('\n')}`,
    )
    .join('\n\n');
  const authoring = blockAuthoringHelp
    .replace(/^\n/, '')
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');

  console.log(`${ui.banner({ version, tagline: 'The ForgeWP CLI' })}
  ${c.bold('Usage')}
    ${ui.command('pnpm forgewp <command>')} ${c.dim('[options]')}

${sections}

  ${c.bold('Examples')}
    ${ui.command('pnpm forgewp make:block Hero --attributes=title,subtitle')}
    ${ui.command('pnpm forgewp make:page About')}
    ${ui.command('pnpm forgewp doctor')}
    ${ui.command('pnpm forgewp export --validate')}

  ${c.bold('Blocks')}
${c.dim(authoring)}
  ${c.dim('Run')} ${ui.command('pnpm forgewp <command> --help')} ${c.dim('for command options.')}
  ${c.dim('Docs')}  ${c.underline('https://forgewp.dev/docs')}
`);
}
