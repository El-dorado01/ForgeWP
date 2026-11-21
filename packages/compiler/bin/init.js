#!/usr/bin/env node
import { isSupportedNode, SUPPORTED_NODE_RANGE } from '../lib/node-runtime.js';
import { createUi } from '../lib/terminal-ui.js';

import { initNextProject } from '../lib/next-init.js';

const ui = createUi();
const { c } = ui;

if (!isSupportedNode()) {
  console.error(ui.errorBlock(`ForgeWP needs Node.js ${SUPPORTED_NODE_RANGE}`, `Found ${process.version}. Install a supported version and try again.`));
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`
  ${c.orange(ui.symbols.info)} ${c.bold('ForgeWP')} init  ${c.dim('add ForgeWP to an existing Next.js App Router project')}

  ${c.bold('Usage:')}
    pnpm forgewp init [options]

  ${c.bold('Options:')}
    --dry-run        Inspect compatibility and preview file changes without writing
    --name <title>   Set the WordPress theme name in wp.config.ts
    --slug <slug>    Set the WordPress theme slug in wp.config.ts
    -h, --help       Show this help
`);
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
const getFlagValue = (flag) => {
  const inline = args.find((a) => a.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
    return args[idx + 1];
  }
  return undefined;
};

const name = getFlagValue('--name');
const slug = getFlagValue('--slug');

console.log(ui.header('init', dryRun ? 'Next.js project · dry run, nothing is written' : 'Next.js project'));

try {
  const report = initNextProject(process.cwd(), { dryRun, name, slug });

  console.log(`  ${c.bold('Compatibility')}`);
  if (report.compatibility.ok) {
    console.log(ui.done('Ready for native WordPress export', 'decoupled mode works too'));
  } else {
    const count = report.compatibility.errors.length;
    console.log(ui.warn(`${count} server-only Next.js feature${count === 1 ? '' : 's'} can't run in a native WordPress theme`));
    for (const err of report.compatibility.errors) {
      console.log(`      ${c.red(ui.symbols.error)} ${c.bold(err.file)}  ${err.message} ${c.dim(`[${err.code}]`)}`);
      console.log(`        ${c.dim(`${ui.symbols.arrow} ${err.suggestion}`)}`);
    }
    console.log(ui.tip(`Recommended mode: Decoupled Next.js (${ui.command('FORGEWP_DEPLOYMENT_MODE=decoupled')} + ${ui.command('FORGEWP_WP_URL')}), or refactor the files above for native export.`));
  }

  for (const warn of report.compatibility.warnings) {
    console.log(`      ${c.yellow(ui.symbols.warn)} ${c.bold(warn.file)}  ${warn.message} ${c.dim(`[${warn.code}]`)}`);
  }

  console.log(`\n  ${c.bold(dryRun ? 'Planned changes' : 'Changes')}`);
  for (const item of report.actions) {
    const label =
      item.action === 'create'
        ? c.green('create')
        : item.action === 'update'
          ? c.cyan('update')
          : c.dim('skip  ');
    console.log(`    ${label}  ${c.bold(item.file)}  ${c.dim(item.detail)}`);
  }

  console.log(`\n  ${c.bold('Next')}`);
  console.log(`    ${c.dim('1.')} Install ${ui.command('@forgewp/react')} and ${ui.command('@forgewp/compiler')}`);
  console.log(`    ${c.dim('2.')} Run ${ui.command('pnpm forgewp doctor')} to check the setup`);
  console.log(
    report.compatibility.ok
      ? `    ${c.dim('3.')} Run ${ui.command('pnpm export')} to build the WordPress theme`
      : `    ${c.dim('3.')} Set ${ui.command('FORGEWP_WP_URL')} in .env.local, then ${ui.command('pnpm dev:decoupled')}`,
  );
  console.log('');
} catch (err) {
  console.error(ui.errorBlock('init failed', err.message));
  process.exit(1);
}
