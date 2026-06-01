/**
 * Copy packages/starter  → packages/create-forgewp/template
 * Copy packages/html-starter → packages/create-forgewp/template-html
 *
 * Run after changing either starter so the CLI ships an up-to-date scaffold.
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const COPY_EXCLUDE = new Set([
  "node_modules",
  "dist",
  ".vite",
  ".forgewp",
  "package-lock.json",
]);

/** @param {string} srcDir  @param {string} destDir  @param {string[]} requiredFiles  @param {string} templateName */
function syncTemplate(srcDir, destDir, requiredFiles, templateName) {
  if (!existsSync(srcDir)) {
    console.error(`Starter not found: ${srcDir}`);
    process.exit(1);
  }

  // Clear previous contents (keep node_modules to avoid thrashing)
  if (existsSync(destDir)) {
    const items = readdirSync(destDir);
    for (const item of items) {
      if (item === "node_modules") continue;
      rmSync(path.join(destDir, item), { recursive: true, force: true });
    }
  }

  cpSync(srcDir, destDir, {
    recursive: true,
    filter: (src) => {
      const relative = path.relative(srcDir, src);
      const parts = relative.split(path.sep);
      if (parts.length > 0 && COPY_EXCLUDE.has(parts[0])) {
        return false;
      }
      return true;
    },
  });

  // Pin @forgewp/compiler workspace:* → real semver so standalone installs work
  const pkgPath = path.join(destDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = templateName;

  if (pkg.devDependencies?.["@forgewp/compiler"]) {
    const compilerPkgPath = path.join(root, "packages", "compiler", "package.json");
    const compilerPkg = JSON.parse(readFileSync(compilerPkgPath, "utf8"));
    pkg.devDependencies["@forgewp/compiler"] = `^${compilerPkg.version}`;
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  // Validate required files are present
  const missing = requiredFiles.filter((file) => !existsSync(path.join(destDir, file)));
  if (missing.length > 0) {
    console.error(`Sync failed [${templateName}] — template missing: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Synced ${path.relative(root, srcDir)} → ${path.relative(root, destDir)}`);
}

// ── React starter ────────────────────────────────────────────────────────────
syncTemplate(
  path.join(root, "packages", "starter"),
  path.join(root, "packages", "create-forgewp", "template"),
  [
    "index.html",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "wp.config.ts",
    "src/main.tsx",
    "src/app/page.tsx",
    "src/app/routes.tsx",
  ],
  "forgewp-scaffold-template",
);

// ── HTML starter ─────────────────────────────────────────────────────────────
syncTemplate(
  path.join(root, "packages", "html-starter"),
  path.join(root, "packages", "create-forgewp", "template-html"),
  [
    "index.html",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "wp.config.ts",
  ],
  "forgewp-html-scaffold-template",
);

console.log("  Optional: pnpm install:template       (React scaffold dev deps)");
console.log("  Optional: pnpm install:template-html  (HTML scaffold dev deps)");
