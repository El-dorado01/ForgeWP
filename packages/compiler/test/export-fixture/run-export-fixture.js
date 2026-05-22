import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { exportTheme } from '../../lib/index.js';
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
  const htmlStarterPath = path.resolve(__dirname, '../../../html-starter');

  if (runBuild) {
    console.log('\n--- 1. BUILDING STARTER THEMES ---');
    console.log('Building React starter theme...');
    execSync('pnpm --filter @forgewp/starter run build', { stdio: 'inherit' });

    console.log('\nBuilding HTML starter theme...');
    execSync('pnpm --filter @forgewp/html-starter run build', { stdio: 'inherit' });
  }

  let allPassed = true;

  console.log('\n--- 2. EXPORTING REACT STARTER THEME ---');
  try {
    const { config, outDir, assets } = await exportTheme({
      themeRoot: starterPath,
      skipBuild: true,
      zip: false,
      validate: true,
      packageManager: 'pnpm',
    });

    console.log('Running extended assertions for React export...');
    const validation = await validateExport({
      themeRoot: starterPath,
      outDir,
      assets,
      config,
      strict: false,
    });

    const success = validation.missing.length === 0;
    console.log('React Export Validation Result:');
    console.log(
      JSON.stringify(
        {
          success,
          slug: config.slug,
          outDir,
          missing: validation.missing,
          warnings: validation.warnings,
        },
        null,
        2,
      ),
    );

    // Explicit validation assertions
    assert(success, 'React starter export should not have missing required files.');
    assert(fs.existsSync(path.join(outDir, 'style.css')), 'React export: style.css must exist.');
    assert(fs.existsSync(path.join(outDir, 'functions.php')), 'React export: functions.php must exist.');
    assert(fs.existsSync(path.join(outDir, 'theme.json')), 'React export: theme.json must exist.');
    assert(fs.existsSync(path.join(outDir, 'forgewp-static/content.html')), 'React export: content.html must exist.');
    assert(fs.existsSync(path.join(outDir, 'forgewp-static/header.html')), 'React export: header.html must exist.');
    assert(fs.existsSync(path.join(outDir, 'forgewp-static/footer.html')), 'React export: footer.html must exist.');

    console.log('React Starter Export Validation PASSED.');
  } catch (err) {
    console.error('React Export failed:', err);
    allPassed = false;
  }

  console.log('\n--- 3. EXPORTING HTML STARTER THEME ---');
  try {
    const { config, outDir, assets } = await exportTheme({
      themeRoot: htmlStarterPath,
      skipBuild: true,
      zip: false,
      validate: true,
      packageManager: 'pnpm',
    });

    console.log('Running extended assertions for HTML export...');
    const validation = await validateExport({
      themeRoot: htmlStarterPath,
      outDir,
      assets,
      config,
      strict: false,
    });

    const success = validation.missing.length === 0;
    console.log('HTML Export Validation Result:');
    console.log(
      JSON.stringify(
        {
          success,
          slug: config.slug,
          outDir,
          missing: validation.missing,
          warnings: validation.warnings,
        },
        null,
        2,
      ),
    );

    // Explicit validation assertions
    assert(success, 'HTML starter export should not have missing required files.');
    assert(fs.existsSync(path.join(outDir, 'style.css')), 'HTML export: style.css must exist.');
    assert(fs.existsSync(path.join(outDir, 'functions.php')), 'HTML export: functions.php must exist.');
    assert(fs.existsSync(path.join(outDir, 'theme.json')), 'HTML export: theme.json must exist.');
    assert(fs.existsSync(path.join(outDir, 'forgewp-static/content.html')), 'HTML export: content.html must exist.');

    console.log('HTML Starter Export Validation PASSED.');
  } catch (err) {
    console.error('HTML Export failed:', err);
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n✨ ALL INTEGRATION FIXTURES EXPORTED AND VALIDATED SUCCESSFULLY! ✨\n');
    process.exit(0);
  } else {
    console.error('\n❌ INTEGRATION FIXTURES ENCOUNTERED FAILURES. ❌\n');
    process.exit(1);
  }
}

main();
