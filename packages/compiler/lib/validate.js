import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getSystemBlueprints, SYSTEM_BLUEPRINTS } from "./blueprints.js";
import { findWpConfigPath } from "./project-language.js";
import { createUi } from './terminal-ui.js';

const ui = createUi();

const DEFAULT_CRITICAL_FILES = [
  { relativePath: "wp.config.ts", name: "Theme configuration file" },
  { relativePath: "index.html", name: "Main HTML entry wrapper" },
  { relativePath: "package.json", name: "NPM Package configuration" },
  { relativePath: "src/main.tsx", name: "React development entry point" },
  { relativePath: "src/app/layout.tsx", name: "Root HTML structural layout" },
  { relativePath: "src/app/routes.tsx", name: "Local Vite preview routing switcher" },
];

const FILE_DESCRIPTIONS = new Map(
  DEFAULT_CRITICAL_FILES.map((file) => [file.relativePath, file.name]),
);

function normalizeCriticalFileEntry(entry) {
  if (typeof entry === "string") {
    return {
      relativePath: entry,
      name: FILE_DESCRIPTIONS.get(entry) || "Framework adapter entry file",
    };
  }
  if (entry && typeof entry === "object" && typeof entry.relativePath === "string") {
    return {
      relativePath: entry.relativePath,
      name: entry.name || FILE_DESCRIPTIONS.get(entry.relativePath) || "Framework adapter entry file",
    };
  }
  return null;
}

function criticalFileExists(themeRoot, relativePath) {
  if (relativePath === "wp.config.ts") {
    return Boolean(findWpConfigPath(themeRoot));
  }
  const fullPath = path.join(themeRoot, relativePath);
  if (existsSync(fullPath)) return true;
  if (relativePath.endsWith(".tsx")) {
    const base = relativePath.slice(0, -4);
    return (
      existsSync(path.join(themeRoot, `${base}.jsx`)) ||
      existsSync(path.join(themeRoot, `${base}.js`))
    );
  }
  if (relativePath.endsWith(".ts")) {
    const base = relativePath.slice(0, -3);
    return (
      existsSync(path.join(themeRoot, `${base}.mjs`)) ||
      existsSync(path.join(themeRoot, `${base}.js`)) ||
      existsSync(path.join(themeRoot, `${base}.cjs`))
    );
  }
  return false;
}

/**
 * Preflight Check & Self-Healing Validator
 *
 * Runs before compiling the theme.
 * - Validates required entry files (delegating to `adapter.getCriticalFiles(themeRoot)` when supplied).
 * - Automatically restores any deleted system-critical utility files using pre-compiled blueprints
 *   (unless opted out by the adapter or caller).
 * - Throws descriptive, highly actionable errors if a user-editable core file is deleted.
 *
 * @param {string} themeRoot Absolute path to the theme root folder.
 * @param {{ adapter?: any, restoreBlueprints?: boolean }} [options]
 */
export function validateCriticalFiles(themeRoot, options = {}) {
  const adapter = options?.adapter?.default || options?.adapter || null;
  const getCriticalFiles =
    adapter && typeof adapter.getCriticalFiles === "function"
      ? adapter.getCriticalFiles
      : null;

  const requiredFiles = getCriticalFiles
    ? getCriticalFiles(themeRoot)
        .map(normalizeCriticalFileEntry)
        .filter(Boolean)
    : DEFAULT_CRITICAL_FILES;

  // 1. Validate User-Editable Files (throw clear, actionable errors)
  for (const file of requiredFiles) {
    if (!criticalFileExists(themeRoot, file.relativePath)) {
      throw new Error(
        `Critical project file is missing: ${file.relativePath}\n` +
        `  Description: ${file.name}\n\n` +
        `  👉 To fix this, please restore the file from your version control (Git) or re-create it from the original ForgeWP theme template.`
      );
    }
  }

  // 2. Validate & Self-Heal System-Critical Files
  const shouldRestoreBlueprints =
    options?.restoreBlueprints !== false && adapter?.skipSystemBlueprints !== true;
  if (!shouldRestoreBlueprints) {
    return;
  }

  const blueprints = getSystemBlueprints(themeRoot);
  for (const [relativePath, blueprintContent] of Object.entries(blueprints)) {
    const fullPath = path.join(themeRoot, relativePath);
    let shouldWrite = false;

    if (!existsSync(fullPath)) {
      if (relativePath.startsWith("cms/") && relativePath.endsWith(".json")) {
        const tsVariant = fullPath.replace(/\.json$/, ".ts");
        if (existsSync(tsVariant)) {
          continue; // Typed .ts file exists, do not recreate default .json blueprint
        }
      }
      console.log(ui.warn(`Restoring missing framework file`, relativePath));
      shouldWrite = true;
    } else if (!relativePath.startsWith("cms/")) {
      try {
        const existingContent = readFileSync(fullPath, "utf8");
        if (existingContent !== blueprintContent) {
          console.log(ui.info(`Updating framework file`, relativePath));
          shouldWrite = true;
        }
      } catch (e) {
        shouldWrite = true;
      }
    }

    if (shouldWrite) {
      // Ensure target directory exists (e.g. src/lib/)
      const dirPath = path.dirname(fullPath);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }

      writeFileSync(fullPath, blueprintContent, "utf8");
      console.log(ui.done(`Framework file ready`, relativePath));
    }
  }
}
