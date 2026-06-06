import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const THEME_ROOT = path.resolve(__dirname, '..');
const EXPORT_OUTPUT = path.join(THEME_ROOT, '.forgewp', 'out', 'hotelchecker24');
const WP_THEMES_PATH = 'C:\\Users\\hp\\Local Sites\\hotelchecker24\\app\\public\\wp-content\\themes';
const THEME_NAME = 'hotelchecker24';
const TARGET_THEME_PATH = path.join(WP_THEMES_PATH, THEME_NAME);

console.log(`\n📦 ForgeWP Theme Sync Utility — hotelchecker24`);
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

  // Step 3: Backup existing theme if it exists
  if (fs.existsSync(TARGET_THEME_PATH)) {
    const backupParentDir = path.join(WP_THEMES_PATH, '../themes-backups');
    if (!fs.existsSync(backupParentDir)) {
      fs.mkdirSync(backupParentDir, { recursive: true });
    }
    const backupPath = path.join(backupParentDir, `${THEME_NAME}.backup-${Date.now()}`);
    console.log(`\n💾 Backing up existing theme to: ${backupPath}`);
    fs.cpSync(TARGET_THEME_PATH, backupPath, { recursive: true });

    // Clean old backups (keep last 3)
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

  console.log(`\n📊 Sync Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✨ Theme exported and synced to local WordPress`);
  console.log(`📍 Location: ${TARGET_THEME_PATH}`);
  console.log(`\n`);
} catch (error) {
  console.error(`\n❌ Sync failed:`, error.message);
  process.exit(1);
}
