#!/usr/bin/env node
import { isSupportedNode, SUPPORTED_NODE_RANGE } from '../lib/node-runtime.js';
import pc from 'picocolors';
import { initNextProject } from '../lib/next-init.js';

if (!isSupportedNode()) {
  console.error(
    `ForgeWP requires Node.js ${SUPPORTED_NODE_RANGE}; found ${process.version}.`,
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`
  ${pc.bold(pc.bgCyan(pc.black('  ⚡ FORGEWP INIT  ')))} ${pc.cyan('— Integrate ForgeWP into an existing Next.js App Router project')}

  ${pc.bold('Usage:')}
    pnpm forgewp init [options]

  ${pc.bold('Options:')}
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

console.log(
  `\n⚡ ${pc.bold(pc.bgCyan(pc.black('  FORGEWP NEXT.JS INIT  ')))}${dryRun ? pc.yellow('  (DRY RUN)') : ''}\n`,
);

try {
  const report = initNextProject(process.cwd(), { dryRun, name, slug });

  console.log(pc.bold('1. Native vs. Decoupled Compatibility Audit'));
  if (report.compatibility.ok) {
    console.log(
      pc.green(
        '   ✅ Ready for Native WordPress theme export (and Decoupled Next.js mode).',
      ),
    );
  } else {
    console.log(
      pc.yellow(
        `   ⚠️  Found ${report.compatibility.errors.length} server-only Next.js feature(s) incompatible with native PHP export:`,
      ),
    );
    for (const err of report.compatibility.errors) {
      console.log(pc.red(`      • [${err.code}] ${err.file}: ${err.message}`));
      console.log(pc.dim(`        → ${err.suggestion}`));
    }
    console.log(
      pc.cyan(
        '   👉 Recommended mode: Decoupled Next.js (FORGEWP_DEPLOYMENT_MODE=decoupled + FORGEWP_WP_URL=...), or refactor the files above for native export.',
      ),
    );
  }

  for (const warn of report.compatibility.warnings) {
    console.log(pc.yellow(`      • [${warn.code}] ${warn.file}: ${warn.message}`));
  }

  console.log(`\n${pc.bold(dryRun ? '2. Planned File Changes (--dry-run)' : '2. Applied Onboarding Changes')}`);
  for (const item of report.actions) {
    const icon =
      item.action === 'create'
        ? pc.green('+ create')
        : item.action === 'update'
          ? pc.cyan('~ update')
          : pc.dim('= skip  ');
    console.log(`   ${icon}  ${pc.bold(item.file)} — ${item.detail}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(pc.bold('\nNext steps:'));
  console.log(`  1. Ensure ${pc.cyan('@forgewp/react')} and ${pc.cyan('@forgewp/compiler')} are installed.`);
  console.log(`  2. Run ${pc.cyan('pnpm forgewp doctor')} to verify your project setup.`);
  if (report.compatibility.ok) {
    console.log(`  3. Run ${pc.cyan('pnpm export')} to generate your native WordPress theme ZIP.`);
  } else {
    console.log(`  3. Set ${pc.cyan('FORGEWP_WP_URL')} in .env.local and run ${pc.cyan('pnpm dev:decoupled')}.`);
  }
  console.log('');
} catch (err) {
  console.error(pc.red(`\n❌ forgewp init failed: ${err.message}\n`));
  process.exit(1);
}
