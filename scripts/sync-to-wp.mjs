#!/usr/bin/env node

/**
 * ForgeWP Theme Sync Utility
 *
 * Exports the theme and syncs directly to the local WordPress installation.
 * Usage: node scripts/sync-to-wp.mjs
 *
 * Set WORDPRESS_THEMES_PATH env var to override the default path:
 * WORDPRESS_THEMES_PATH="/path/to/themes" node scripts/sync-to-wp.mjs
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const THEME_NAME = process.argv[2] || 'forgewp-starter';
const THEME_ROOT = THEME_NAME === 'forgewp-starter'
  ? path.resolve(__dirname, '../packages/starter')
  : path.resolve(__dirname, `../${THEME_NAME}`);
const EXPORT_OUTPUT = path.join(
  THEME_ROOT,
  '.forgewp',
  'out',
  THEME_NAME,
);
let WP_SITE_NAME = ['hotelchecker24', 'comfortable-decor'].includes(THEME_NAME) ? THEME_NAME : 'forgewp';
if (fs.existsSync('C:\\Users\\hp\\Local Sites\\ForgeWP')) {
  WP_SITE_NAME = 'ForgeWP';
} else if (fs.existsSync('C:\\Users\\hp\\Local Sites\\forgewp')) {
  WP_SITE_NAME = 'forgewp';
}

const DEFAULT_WP_THEMES_PATH =
  `C:\\Users\\hp\\Local Sites\\${WP_SITE_NAME}\\app\\public\\wp-content\\themes`;
const WP_THEMES_PATH =
  process.env.WORDPRESS_THEMES_PATH || DEFAULT_WP_THEMES_PATH;
const TARGET_THEME_PATH = path.join(WP_THEMES_PATH, THEME_NAME);

console.log(`\n📦 ForgeWP Theme Sync Utility`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Theme Root: ${THEME_ROOT}`);
console.log(`Export Output: ${EXPORT_OUTPUT}`);
console.log(`WordPress Themes: ${WP_THEMES_PATH}`);
console.log(`Target Theme: ${TARGET_THEME_PATH}`);

try {
  // Step 1: Export with --no-zip
  console.log(`\n⚙️  Step 1: Exporting theme (no ZIP)...`);
  execSync(`pnpm forgewp export --no-zip`, {
    cwd: THEME_ROOT,
    stdio: 'inherit',
  });

  // Step 2: Verify export output exists
  if (!fs.existsSync(EXPORT_OUTPUT)) {
    throw new Error(`Export output not found at ${EXPORT_OUTPUT}`);
  }
  console.log(`✅ Export successful`);

  // Step 3: Backup existing theme if it exists (saved outside of the themes folder to prevent WP from seeing it)
  if (fs.existsSync(TARGET_THEME_PATH)) {
    const backupParentDir = path.join(WP_THEMES_PATH, '../themes-backups');
    if (!fs.existsSync(backupParentDir)) {
      fs.mkdirSync(backupParentDir, { recursive: true });
    }
    const backupPath = path.join(backupParentDir, `${THEME_NAME}.backup-${Date.now()}`);
    console.log(`\n💾 Backing up existing theme to: ${backupPath}`);
    fs.cpSync(TARGET_THEME_PATH, backupPath, { recursive: true });

    // Keep only the 3 most recent backups to prevent disk space bloat
    try {
      const backups = fs.readdirSync(backupParentDir)
        .filter(f => f.startsWith(`${THEME_NAME}.backup-`))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupParentDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > 3) {
        for (let i = 3; i < backups.length; i++) {
          fs.rmSync(path.join(backupParentDir, backups[i].name), { recursive: true, force: true });
        }
      }
    } catch (e) {
      console.warn(`⚠️ Could not clean up old backups: ${e.message}`);
    }

    fs.rmSync(TARGET_THEME_PATH, { recursive: true, force: true });
  }

  // Step 4: Sync exported theme to WordPress
  console.log(`\n📤 Syncing to WordPress theme directory...`);
  if (!fs.existsSync(WP_THEMES_PATH)) {
    throw new Error(`WordPress themes directory not found: ${WP_THEMES_PATH}`);
  }

  fs.cpSync(EXPORT_OUTPUT, TARGET_THEME_PATH, { recursive: true });
  console.log(`✅ Theme synced successfully`);

  // Step 5: Report summary
  console.log(`\n📊 Sync Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✨ Theme exported and synced to local WordPress`);
  console.log(`📍 Location: ${TARGET_THEME_PATH}`);
  console.log(`🌐 Visit: http://forgewp.local`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Refresh your browser to see the updated theme`);
  console.log(
    `   2. Check WP Admin → Appearance → Themes to verify activation`,
  );
  console.log(`   3. If using WordPress caching, clear the cache manually`);
  console.log(`\n`);
} catch (error) {
  console.error(`\n❌ Sync failed:`, error.message);
  process.exit(1);
}
