#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import * as p from '@clack/prompts';
import { applyProjectConfig } from './lib/apply-config.js';
import { convertProjectToJs } from './lib/convert-to-js.js';
import { copyTemplate } from './lib/copy-template.js';
import { installDependencies } from './lib/install.js';
import { createUi, formatDuration } from './lib/terminal-ui.js';
import {
  detectPackageManager,
  isValidProjectDirName,
  slugify,
  titleCaseFromSlug,
} from './lib/utils.js';
import { addToPnpmWorkspace } from './lib/workspace.js';
import { COMPONENT_REGISTRY } from './lib/registry.js';

const ui = createUi();
const { c } = ui;
const VERSION = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
).version;
const DOCS_URL = 'https://forgewp.dev/docs';

const ADAPTERS = {
  react: { label: 'React', hint: 'Vite + React 19', tagline: 'Build WordPress themes with React & Vite' },
  nextjs: { label: 'Next.js', hint: 'App Router · native WordPress or decoupled', tagline: 'Build WordPress themes with Next.js' },
  html: { label: 'HTML', hint: 'static HTML', tagline: 'Build WordPress themes from static HTML' },
};
const GENERAL_TAGLINE = 'Build WordPress themes with React or Next.js';

/** Print an error with its fix and exit. Never prints a stack trace. */
function fail(message, ...details) {
  console.error(`\n${ui.error(message)}`);
  for (const line of details) console.error(ui.detail(line));
  console.error('');
  process.exit(1);
}

/** Exit cleanly when a prompt is cancelled with Ctrl+C / Esc. */
function guard(value) {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled. Nothing was created.');
    process.exit(0);
  }
  return value;
}

function printHelp() {
  const cmd = (text) => ui.command(text);
  console.log(ui.banner({ version: VERSION, tagline: GENERAL_TAGLINE }));
  console.log(`  ${c.bold('Usage')}
    ${cmd('npx create-forgewp')} ${c.dim('[project-directory] [options]')}
    ${cmd('npx create-forgewp add')} ${c.dim('[component]')}

  ${c.bold('Options')}
    ${cmd('--adapter <name>')}    react, nextjs or html ${c.dim('(default: react)')}
    ${cmd('--js')}                JavaScript & JSX instead of TypeScript
    ${cmd('--ts')}                TypeScript & TSX ${c.dim('(default)')}
    ${cmd('-y, --yes')}           Accept defaults, no questions
    ${cmd('--no-install')}        Skip installing dependencies
    ${cmd('-h, --help')}          Show this help

  ${c.bold('Examples')}
    ${cmd('npx create-forgewp my-theme')}
    ${cmd('npx create-forgewp my-site --adapter nextjs')}
    ${cmd('npx create-forgewp my-theme --js --yes')}

  ${c.dim('Docs')}  ${c.underline(DOCS_URL)}
`);
}

function parseArgs(argv) {
  const args = {
    projectDir: undefined,
    adapter: 'react',
    adapterExplicit: false,
    language: 'ts',
    languageExplicit: false,
    yes: false,
    noInstall: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      args.help = true;
      continue;
    }
    if (arg === '-y' || arg === '--yes') {
      args.yes = true;
      continue;
    }
    if (arg === '--no-install') {
      args.noInstall = true;
      continue;
    }
    if (arg === '--js' || arg === '--javascript') {
      args.language = 'js';
      args.languageExplicit = true;
      continue;
    }
    if (arg === '--ts' || arg === '--typescript') {
      args.language = 'ts';
      args.languageExplicit = true;
      continue;
    }
    if (arg === '--projectName') {
      args.projectDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--projectName=')) {
      args.projectDir = arg.split('=')[1];
      continue;
    }
    if (arg === '--adapter') {
      args.adapter = argv[i + 1];
      args.adapterExplicit = true;
      i += 1;
      continue;
    }
    if (arg.startsWith('--adapter=')) {
      args.adapter = arg.split('=')[1];
      args.adapterExplicit = true;
      continue;
    }
    if (arg === '--style') {
      args.style = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--style=')) {
      args.style = arg.split('=')[1];
      continue;
    }
    if (arg.startsWith('-')) {
      fail(`Unknown option: ${arg}`, `Run ${ui.command('npx create-forgewp --help')} to see the available options.`);
    }
    if (!args.projectDir) {
      args.projectDir = arg;
    }
  }

  if (!Object.hasOwn(ADAPTERS, args.adapter)) {
    fail(`Unsupported adapter: ${args.adapter}`, `Use one of: ${Object.keys(ADAPTERS).join(', ')}.`);
  }
  if (args.style && args.style !== 'shadcn') {
    fail(`Style preset '${args.style}' is coming soon.`, "Only the 'shadcn' style is available for now.");
  }

  return args;
}

function describeFor(adapter) {
  return adapter === 'html'
    ? 'A premium static HTML theme built with ForgeWP.'
    : adapter === 'nextjs'
      ? 'A WordPress theme built with Next.js App Router and ForgeWP.'
      : 'A premium block-theme built with React, Tailwind CSS, and ForgeWP.';
}

async function gatherConfig(cli, defaults) {
  if (cli.yes) return defaults;

  const themeName = guard(
    await p.text({
      message: 'Theme name',
      initialValue: defaults.themeName,
      validate: (value) => (value && value.trim().length > 0 ? undefined : 'A theme name is required.'),
    }),
  );

  const adapter = guard(
    await p.select({
      message: 'Framework',
      initialValue: cli.adapter,
      options: Object.entries(ADAPTERS).map(([value, a]) => ({ value, label: a.label, hint: a.hint })),
    }),
  );

  let language = defaults.language;
  if (adapter !== 'html' && !cli.languageExplicit) {
    language = guard(
      await p.select({
        message: 'Language',
        initialValue: cli.language,
        options: [
          { value: 'ts', label: 'TypeScript', hint: '.ts / .tsx' },
          { value: 'js', label: 'JavaScript', hint: '.js / .jsx' },
        ],
      }),
    );
  }

  let style = defaults.style;
  let features = [];
  if (adapter === 'react') {
    style = guard(
      await p.select({
        message: 'Style preset',
        initialValue: 'shadcn',
        options: [
          { value: 'shadcn', label: 'Shadcn', hint: 'smooth modern curves' },
          { value: 'forgewp', label: 'ForgeWP', hint: 'sharp geometric corners · coming soon', disabled: true },
        ],
      }),
    );
    features = guard(
      await p.multiselect({
        message: 'Optional features',
        required: false,
        initialValues: ['ecommerce'],
        options: [
          { value: 'ecommerce', label: 'WooCommerce', hint: 'e-commerce blocks and hooks' },
          { value: 'auth', label: 'Auth sandbox', hint: 'login, sign-up and account pages' },
        ],
      }),
    );
  }

  let install = false;
  let packageManager = defaults.packageManager;
  if (!cli.noInstall) {
    install = guard(await p.confirm({ message: 'Install dependencies now?', initialValue: true }));
    if (install) {
      packageManager = guard(
        await p.select({
          message: 'Package manager',
          initialValue: defaults.packageManager,
          options: ['pnpm', 'npm', 'yarn', 'bun'].map((value) => ({
            value,
            label: value,
            hint: value === defaults.packageManager ? 'detected' : undefined,
          })),
        }),
      );
    }
  }

  const slug = slugify(themeName);
  return {
    ...defaults,
    packageName: slug,
    themeName,
    slug,
    description: describeFor(adapter),
    textDomain: slug,
    adapter,
    language: adapter === 'html' ? 'ts' : language,
    style,
    features,
    install,
    packageManager,
  };
}

async function handleAddCommand(componentName) {
  console.log(ui.header('add', 'component'));

  const hasConfig = ['wp.config.ts', 'wp.config.mts', 'wp.config.js', 'wp.config.mjs', 'wp.config.cjs'].some(
    (name) => existsSync(path.join(cwd(), name)),
  );
  if (!hasConfig) {
    fail(
      'No ForgeWP project found in this folder.',
      'Run this command inside a theme project (a folder with wp.config.ts or wp.config.js).',
    );
  }

  const COMPONENTS = {
    navbar: { name: 'Navbar', hint: 'dynamic site header' },
    'hero-section': { name: 'HeroSection', hint: 'modern hero' },
    'pricing-table': { name: 'PricingTable', hint: 'tiered pricing sheet' },
  };

  let selected = componentName;
  if (!selected) {
    selected = guard(
      await p.select({
        message: 'Component to add',
        options: Object.keys(COMPONENT_REGISTRY).map((key) => ({
          value: key,
          label: key,
          hint: COMPONENTS[key]?.hint,
        })),
      }),
    );
  }

  const componentData = COMPONENT_REGISTRY[selected];
  if (!componentData) {
    fail(
      `Component "${selected}" is not in the registry.`,
      `Available: ${Object.keys(COMPONENT_REGISTRY).join(', ')}`,
    );
  }

  const componentsDir = path.join(cwd(), 'src', 'components');
  if (!existsSync(componentsDir)) mkdirSync(componentsDir, { recursive: true });
  const targetFile = path.join(componentsDir, componentData.filename);
  writeFileSync(targetFile, componentData.code, 'utf8');

  const exportName = COMPONENTS[selected]?.name ?? selected;
  const relative = path.relative(cwd(), targetFile).replaceAll('\\', '/');
  console.log(ui.done(`Added ${exportName}`, relative));
  console.log('');
  console.log(ui.detail('Use it in a page:'));
  console.log(`    ${ui.command(`import { ${exportName} } from "@/components/${componentData.filename.replace('.tsx', '')}";`)}`);
  console.log(`    ${ui.command(`<${exportName} />`)}\n`);
}

/**
 * A spinner on interactive terminals; plain status lines elsewhere (CI, pipes),
 * so non-TTY output never contains cursor escape codes.
 */
function task(message, { timer = false } = {}) {
  if (process.stdout.isTTY) {
    const s = p.spinner(timer ? { indicator: 'timer' } : undefined);
    s.start(message);
    return { stop: (msg) => s.stop(msg), error: (msg) => s.error(msg) };
  }
  return { stop: (msg) => p.log.step(msg), error: (msg) => p.log.error(msg) };
}

function runCommand(pm, script) {
  if (pm === 'npm') return `npm run ${script}`;
  if (pm === 'bun') return `bun run ${script}`;
  return `${pm} ${script}`;
}

async function main() {
  const startedAt = Date.now();
  const args = process.argv.slice(2);
  if (args[0] === 'add') {
    await handleAddCommand(args[1]);
    return;
  }

  const cli = parseArgs(args);
  if (cli.help) {
    printHelp();
    return;
  }

  console.log(
    ui.banner({
      version: VERSION,
      tagline: cli.adapterExplicit ? ADAPTERS[cli.adapter].tagline : GENERAL_TAGLINE,
    }),
  );
  p.intro(c.dim('Create a new ForgeWP theme'));

  let projectDirName = cli.projectDir;
  if (!projectDirName && !cli.yes) {
    projectDirName = guard(
      await p.text({
        message: 'Project folder',
        initialValue: 'my-forgewp-theme',
        validate: (value) =>
          value && isValidProjectDirName(value) ? undefined : 'Use letters, numbers, dots, dashes or underscores.',
      }),
    );
  }
  if (!projectDirName) projectDirName = 'my-forgewp-theme';

  if (!isValidProjectDirName(path.basename(projectDirName))) {
    fail(`Invalid project folder name: ${projectDirName}`, 'Use letters, numbers, dots, dashes or underscores.');
  }

  const targetDir = path.resolve(cwd(), projectDirName);
  const displayDir = `./${path.relative(cwd(), targetDir).replaceAll('\\', '/') || '.'}`;
  if (
    existsSync(path.join(targetDir, 'package.json')) ||
    existsSync(path.join(targetDir, 'wp.config.ts')) ||
    existsSync(path.join(targetDir, 'wp.config.js'))
  ) {
    fail(`${displayDir} already contains a project.`, 'Choose a different folder name, or remove the existing project first.');
  }

  const slug = slugify(path.basename(projectDirName));
  const adapter = cli.adapter || 'react';
  const defaults = {
    packageName: slug,
    themeName: titleCaseFromSlug(slug),
    slug,
    description: describeFor(adapter),
    textDomain: slug,
    adapter,
    language: adapter === 'html' ? 'ts' : cli.language || 'ts',
    style: cli.style || 'shadcn',
    features: adapter === 'react' ? ['ecommerce'] : [],
    version: '0.1.0',
    install: !cli.noInstall,
    packageManager: detectPackageManager(),
  };

  const config = await gatherConfig(cli, defaults);
  const languageLabel = config.adapter === 'html' ? '' : config.language === 'js' ? ' · JavaScript' : ' · TypeScript';

  // 1. Scaffold
  const scaffoldStart = Date.now();
  const scaffold = task(`Creating ${displayDir}`);
  copyTemplate(targetDir, config.adapter);
  applyProjectConfig(targetDir, config);
  if (config.language === 'js') convertProjectToJs(targetDir, config.adapter);
  if (config.packageManager === 'pnpm') addToPnpmWorkspace(targetDir);
  scaffold.stop(
    `Created ${c.bold(displayDir)}  ${c.dim(`${ADAPTERS[config.adapter].label}${languageLabel} · ${formatDuration(Date.now() - scaffoldStart)}`)}`,
  );

  // 2. Install
  if (config.install) {
    const installStart = Date.now();
    const installing = task(`Installing dependencies with ${config.packageManager}`, { timer: true });
    const result = await installDependencies(targetDir, config.packageManager);
    if (!result.ok) {
      installing.error(`${config.packageManager} install failed`);
      const tail = result.output.trim().split(/\r?\n/).slice(-15);
      if (tail.length) p.log.message(c.dim(tail.join('\n')));
      p.outro(
        `The project was created, but dependencies are not installed.\n   Fix the error above, then run ${ui.command(`cd ${displayDir} && ${config.packageManager} install`)}`,
      );
      process.exit(1);
    }
    installing.stop(`Dependencies installed  ${c.dim(`${config.packageManager} · ${formatDuration(Date.now() - installStart)}`)}`);
  }

  // 3. Next steps
  const pm = config.packageManager;
  const cdTarget = path.relative(cwd(), targetDir).replaceAll('\\', '/') || '.';
  const steps = [`cd ${cdTarget}`];
  if (!config.install) steps.push(`${pm} install`);
  steps.push(runCommand(pm, 'dev'), runCommand(pm, 'export'));
  const labels = {
    [`cd ${cdTarget}`]: '',
    [`${pm} install`]: 'install dependencies',
    [runCommand(pm, 'dev')]: 'start the dev server',
    [runCommand(pm, 'export')]: 'build the WordPress theme zip',
  };
  const width = Math.max(...steps.map((s) => s.length));
  p.note(
    steps.map((s) => `${ui.command(s.padEnd(width))}   ${c.dim(labels[s])}`).join('\n'),
    'Next steps',
  );
  p.outro(
    `${c.green(ui.symbols.done)} ${c.bold(`${config.themeName} is ready`)}  ${c.dim(formatDuration(Date.now() - startedAt))}\n   ${c.dim('Docs')}  ${c.underline(DOCS_URL)}`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error), 'If this keeps happening, please open an issue on GitHub.');
});
