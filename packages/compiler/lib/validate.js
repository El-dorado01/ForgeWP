import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { SYSTEM_BLUEPRINTS } from "./blueprints.js";

/**
 * Preflight Check & Self-Healing Validator
 *
 * Runs before compiling the theme.
 * - Automatically restores any deleted system-critical utility files using pre-compiled blueprints.
 * - Automatically updates system-critical files if their content differs from compiler blueprints.
 * - Throws descriptive, highly actionable errors if a user-editable core file is deleted.
 *
 * @param {string} themeRoot Absolute path to the theme root folder.
 */
export function validateCriticalFiles(themeRoot) {
  const USER_EDITABLE_FILES = [
    { relativePath: "wp.config.ts", name: "Theme configuration file" },
    { relativePath: "index.html", name: "Main HTML entry wrapper" },
    { relativePath: "package.json", name: "NPM Package configuration" },
    { relativePath: "src/main.tsx", name: "React development entry point" },
    { relativePath: "src/app/layout.tsx", name: "Root HTML structural layout" },
    { relativePath: "src/app/routes.tsx", name: "Local Vite preview routing switcher" },
  ];

  // 1. Validate User-Editable Files (throw clear, actionable errors)
  for (const file of USER_EDITABLE_FILES) {
    const fullPath = path.join(themeRoot, file.relativePath);
    if (!existsSync(fullPath)) {
      throw new Error(
        `Critical project file is missing: ${pc.bold(file.relativePath)}\n` +
        `  Description: ${file.name}\n\n` +
        `  👉 To fix this, please restore the file from your version control (Git) or re-create it from the original ForgeWP theme template.`
      );
    }
  }

  // 2. Validate & Self-Heal System-Critical Files
  for (const [relativePath, blueprintContent] of Object.entries(SYSTEM_BLUEPRINTS)) {
    const fullPath = path.join(themeRoot, relativePath);
    let shouldWrite = false;

    if (!existsSync(fullPath)) {
      console.log(pc.yellow(`  ⚠️  System file ${pc.bold(relativePath)} was missing! Restoring default system blueprint...`));
      shouldWrite = true;
    } else if (!relativePath.startsWith("cms/")) {
      try {
        const existingContent = readFileSync(fullPath, "utf8");
        if (existingContent !== blueprintContent) {
          console.log(pc.yellow(`  🔄  System file ${pc.bold(relativePath)} is out of date! Updating to latest system blueprint...`));
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
      console.log(pc.green(`  ✅ Successfully restored/updated system file: ${relativePath}`));
    }
  }
}
