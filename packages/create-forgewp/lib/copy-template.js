import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveTemplateDir() {
  const bundled = path.join(__dirname, "..", "template");
  if (existsSync(bundled)) {
    return bundled;
  }

  // Monorepo dev fallback when template was not synced yet
  const fromStarter = path.join(__dirname, "..", "..", "starter");
  if (existsSync(fromStarter)) {
    return fromStarter;
  }

  throw new Error(
    "ForgeWP template not found. Run: pnpm sync:template from the ForgeWP repo.",
  );
}

export function copyTemplate(targetDir) {
  const templateDir = resolveTemplateDir();

  mkdirSync(targetDir, { recursive: true });

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return !["node_modules", "dist", ".vite"].includes(base);
    },
  });
}
