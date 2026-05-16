import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_TEMPLATE_FILES } from "./template-files.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COPY_EXCLUDE = new Set([
  "node_modules",
  "dist",
  ".vite",
  ".forgewp",
  "package-lock.json",
]);

export function resolveTemplateDir() {
  const bundled = path.join(__dirname, "..", "template");
  if (existsSync(bundled)) {
    validateTemplateDir(bundled);
    return bundled;
  }

  const fromStarter = path.join(__dirname, "..", "..", "starter");
  if (existsSync(fromStarter)) {
    return fromStarter;
  }

  throw new Error(
    "ForgeWP template not found. Run: pnpm sync:template from the ForgeWP repo.",
  );
}

/**
 * @param {string} templateDir
 */
export function validateTemplateDir(templateDir) {
  const missing = REQUIRED_TEMPLATE_FILES.filter(
    (file) => !existsSync(path.join(templateDir, file)),
  );

  if (missing.length > 0) {
    throw new Error(
      `CLI template is incomplete (missing: ${missing.join(", ")}).\n` +
        "From the ForgeWP repo root, run: pnpm sync:template",
    );
  }
}

export function copyTemplate(targetDir) {
  const templateDir = resolveTemplateDir();

  mkdirSync(targetDir, { recursive: true });

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return !COPY_EXCLUDE.has(base);
    },
  });
}
