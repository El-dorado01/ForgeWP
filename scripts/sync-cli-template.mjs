/**
 * Copy packages/starter → packages/create-forgewp/template
 * Run after changing the starter so the CLI ships an up-to-date scaffold.
 */
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const starterDir = path.join(root, "packages", "starter");
const templateDir = path.join(root, "packages", "create-forgewp", "template");

const COPY_EXCLUDE = new Set([
  "node_modules",
  "dist",
  ".vite",
  ".forgewp",
  "package-lock.json",
]);

const REQUIRED_FILES = [
  "index.html",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "wp.config.ts",
  "src/main.tsx",
  "src/app/page.tsx",
];

if (!existsSync(starterDir)) {
  console.error(`Starter not found: ${starterDir}`);
  process.exit(1);
}

if (existsSync(templateDir)) {
  rmSync(templateDir, { recursive: true, force: true });
}

cpSync(starterDir, templateDir, {
  recursive: true,
  filter: (src) => {
    const base = path.basename(src);
    return !COPY_EXCLUDE.has(base);
  },
});

const pkgPath = path.join(templateDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = "forgewp-scaffold-template";

// Standalone scaffolds need @forgewp/compiler for theme export
if (pkg.devDependencies?.["@forgewp/compiler"]) {
  // Convert workspace:* to a real version (match packages/compiler/package.json)
  pkg.devDependencies["@forgewp/compiler"] = "^0.1.4";
}

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

const missing = REQUIRED_FILES.filter((file) => !existsSync(path.join(templateDir, file)));

if (missing.length > 0) {
  console.error(`Sync failed — template missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Synced starter → ${path.relative(root, templateDir)}`);
console.log("  Optional: pnpm install:template  (only if editing template/ in the IDE)");
