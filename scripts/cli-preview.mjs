/**
 * Visual preview of the ForgeWP terminal UI (packages/compiler/lib/terminal-ui.js).
 * Run from the repo root:  node scripts/cli-preview.mjs
 * Nothing is written to disk; this only prints sample output.
 */
import { readFileSync } from 'node:fs';
import { createUi, formatDuration } from '../packages/compiler/lib/terminal-ui.js';

const { version } = JSON.parse(
  readFileSync(new URL('../packages/compiler/package.json', import.meta.url), 'utf8'),
);
const ui = createUi();
const { c, symbols } = ui;
const section = (title) => console.log(`\n${c.dim('─'.repeat(64))}\n${c.dim(`  ${title}`)}\n`);

section('1. Banner: create-forgewp and `forgewp --help` only (tagline follows the adapter)');
console.log(ui.banner({ version, tagline: 'Build WordPress themes with Next.js' }));
console.log(ui.banner({ version, tagline: 'Build WordPress themes with React & Vite' }));

section('2. Everyday commands: one quiet header line');
console.log(ui.header('export', 'forgewp-starter · react'));
console.log(ui.header('doctor'));

section('3. Status lines');
console.log(ui.step('Building assets with the react adapter'));
console.log(ui.done('Assets built', formatDuration(3240)));
console.log(ui.done('Theme exported', `./.forgewp/my-site.zip  ${formatDuration(14180)}`));
console.log(ui.warn('Footer is empty', 'layout has no <footer>; fine if intended'));
console.log(ui.info('3 blocks compiled', 'hero-intro, cta, faq'));

section('4. Errors say what, why, and the fix');
console.log(ui.error('Export failed: wp.config.ts not found'));
console.log(ui.detail('ForgeWP looks for wp.config.ts (or .js / .mjs) in the project root.'));
console.log(ui.detail(`Fix: run ${ui.command('pnpm forgewp init')} to create one.`));

section('5. Ending: next commands and one docs link');
console.log(`  ${c.green(symbols.done)} ${c.bold('my-site is ready')}  ${c.dim(formatDuration(21600))}\n`);
console.log(`  ${c.dim('Next')}   ${ui.command('cd my-site')} ${c.dim(symbols.arrow)} ${ui.command('pnpm dev')} ${c.dim(symbols.arrow)} ${ui.command('pnpm export')}`);
console.log(`  ${c.dim('Docs')}   ${c.underline('https://forgewp.dev/docs')}\n`);

section('6. Plain fallback: CI logs, pipes, NO_COLOR (no escape codes)');
const plain = createUi({ env: { NO_COLOR: '1' } });
console.log(plain.banner({ version, tagline: 'Build WordPress themes with Next.js' }));
console.log(plain.done('Theme exported', './.forgewp/my-site.zip  14.2s'));

console.log(`\n${c.dim(`  Colour level detected: ${ui.level} (0 none, 1 basic, 2 256-colour, 3 truecolor)`)}\n`);
