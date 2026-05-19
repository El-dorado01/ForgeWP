import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { exportTheme, scanForHydrationIslands } from '../../lib/index.js';
import { validateExport } from '../../lib/validate-export.js';

function assert(condition, message) {
  if (!condition) {
    console.error('Assertion failed:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

async function main() {
  const runBuild = process.env.RUN_BUILD !== 'false';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const starterPath = path.resolve(__dirname, '../../../starter');

  if (runBuild) {
    console.log(
      'Running starter build (pnpm --filter @forgewp/starter run build)...',
    );
    execSync('pnpm --filter @forgewp/starter run build', { stdio: 'inherit' });
  }

  console.log('Calling exportTheme()...');
  try {
    const { config, outDir, assets } = await exportTheme({
      themeRoot: starterPath,
      skipBuild: true,
      zip: false,
      validate: true,
      packageManager: 'pnpm',
    });

      // Delegate to shared validator
      const validation = await validateExport({ themeRoot: starterPath, outDir, assets, config, strict: false });

      const summary = { missing: validation.missing || [], warnings: validation.warnings || [] };

    

    const success = summary.missing.length === 0;
    console.log(
      JSON.stringify(
        {
          success,
          slug: config.slug,
          outDir,
          missing: summary.missing,
          warnings: summary.warnings,
        },
        null,
        2,
      ),
    );

    if (!success) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

main();
