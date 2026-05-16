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
    return !["node_modules", "dist", ".vite"].includes(base);
  },
});

// Distinct name so this folder is not confused with packages/starter in the monorepo.
const pkgPath = path.join(templateDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = "forgewp-scaffold-template";
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log(`Synced starter → ${path.relative(root, templateDir)}`);
console.log("  Run: pnpm install:template  (for IDE types in template/)");
