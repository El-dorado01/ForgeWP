import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pc from "picocolors";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The canonical shadcn components.json file expected at the project root.
 * ForgeWP ensures this exists before delegating to the shadcn CLI.
 * It points to the standard ForgeWP project layout.
 */
const SHADCN_COMPONENTS_JSON = {
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds a UI component to the ForgeWP project.
 *
 * Flow:
 *  1. Ensure shadcn's components.json is present (create if missing).
 *  2. Run `shadcn add <component>` — shadcn handles all npm deps, Tailwind
 *     plugins, CSS vars, and globals.css registration automatically via its
 *     own remote registry.json for every component it knows about.
 *  3. If ForgeWP has a local override (`@forgewp/ui/components/<name>/forgewp.tsx`),
 *     overwrite shadcn's freshly installed copy with the ForgeWP version.
 *     Read the component's registry.json for any additional plugin requirements
 *     not covered by shadcn (e.g. ForgeWP-native components that aren't in
 *     the shadcn remote registry).
 *  4. If style === "forgewp", apply the neo-brutalist sharpening transform.
 *
 * @param {string} component - The component name (e.g. "sheet", "navbar").
 * @param {{ style?: "shadcn" | "forgewp" }} options
 */
export async function addComponent(component, options) {
  const { style = "shadcn" } = options;
  const projectRoot = process.cwd();

  console.log(pc.cyan(`\n  ForgeWP add — ${component}\n`));

  // ── Step 1: Guarantee components.json exists ───────────────────────────────
  ensureComponentsJson(projectRoot);

  // ── Step 2: Detect package manager ────────────────────────────────────────
  const { installCmd, shadcnCmd } = detectPackageManager(projectRoot);

  // ── Step 3: Check for a ForgeWP local override ────────────────────────────
  const localRegistry = resolveLocalRegistry(component);
  const hasLocalOverride = localRegistry !== null && existsSync(localRegistry.tsxPath);

  // ── Step 4: Run shadcn add (primary install source for everything) ─────────
  console.log(pc.dim(`  Installing ${component} via shadcn...`));
  try {
    execSync(`${shadcnCmd} add ${component} --yes`, {
      stdio: "inherit",
      cwd: projectRoot,
      shell: process.platform === "win32",
    });
  } catch (err) {
    // shadcn may fail for ForgeWP-native components not in the shadcn registry.
    // If we have a local override, that's fine — we'll install it ourselves below.
    if (!hasLocalOverride) {
      throw new Error(
        `Failed to install "${component}" via shadcn, and no ForgeWP local override exists.\n` +
        `Details: ${err.message}`
      );
    }
    console.log(pc.yellow(`  ⚠  shadcn does not know "${component}" — using ForgeWP local registry instead.`));
  }

  // ── Step 5: Install ForgeWP local override (if present) ───────────────────
  if (hasLocalOverride) {
    console.log(pc.dim(`  Applying ForgeWP override for ${component}...`));

    const targetDir = path.join(projectRoot, "src", "components", "ui");
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    const targetFile = path.join(targetDir, `${component}.tsx`);
    const content = readFileSync(localRegistry.tsxPath, "utf8");
    writeFileSync(targetFile, content, "utf8");

    // Install any extra Tailwind plugins declared in the ForgeWP registry.json
    // that shadcn's remote registry wouldn't know about (ForgeWP-native components).
    if (localRegistry.meta?.tailwindPlugins?.length > 0) {
      await ensureTailwindPlugins(localRegistry.meta.tailwindPlugins, installCmd, projectRoot);
    }

    console.log(pc.dim(`  ↳ Override written to src/components/ui/${component}.tsx`));
  }

  // ── Step 6: Apply ForgeWP sharpening (when style === "forgewp") ────────────
  if (style === "forgewp") {
    const uiDir = path.join(projectRoot, "src", "components", "ui");
    if (existsSync(uiDir)) {
      const files = readdirSync(uiDir).filter(f =>
        f.toLowerCase().includes(component.toLowerCase().replace(/-/g, "")) ||
        f.toLowerCase().includes(component.toLowerCase())
      );
      const targets = files.length > 0 ? files : readdirSync(uiDir);
      targets.forEach(f => {
        if (f.endsWith(".tsx")) sharpenFile(path.join(uiDir, f));
      });
    }
  }

  console.log(pc.green(`\n  ✅ ${component} ready in src/components/ui/\n`));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures shadcn's components.json exists at the project root.
 * If missing, writes the standard ForgeWP default so `shadcn add` works
 * without requiring the developer to run `shadcn init` manually.
 */
function ensureComponentsJson(projectRoot) {
  const targetPath = path.join(projectRoot, "components.json");
  if (existsSync(targetPath)) return;

  try {
    writeFileSync(targetPath, JSON.stringify(SHADCN_COMPONENTS_JSON, null, 2), "utf8");
    console.log(pc.green(`  ✅ Created components.json (shadcn configuration)`));
  } catch (err) {
    console.log(pc.yellow(`  ⚠  Could not create components.json: ${err.message}`));
    console.log(pc.yellow(`     Run "pnpm dlx shadcn@latest init" to initialize shadcn manually.`));
  }
}

/**
 * Detects the project's package manager from lockfiles and returns
 * the appropriate install and shadcn CLI commands.
 */
function detectPackageManager(projectRoot) {
  let installCmd = "npm install --save-dev";
  let shadcnCmd = "npx shadcn@latest";

  let current = projectRoot;
  while (current) {
    if (existsSync(path.join(current, "pnpm-lock.yaml"))) {
      installCmd = "pnpm add -D";
      shadcnCmd = "pnpm dlx shadcn@latest";
      break;
    }
    if (existsSync(path.join(current, "yarn.lock"))) {
      installCmd = "yarn add -D";
      shadcnCmd = "yarn dlx shadcn@latest";
      break;
    }
    if (existsSync(path.join(current, "bun.lockb"))) {
      installCmd = "bun add -d";
      shadcnCmd = "bunx --bun shadcn@latest";
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return { installCmd, shadcnCmd };
}

/**
 * Checks the `@forgewp/ui` local registry for a component override.
 * Returns an object with the tsx path and parsed registry.json metadata,
 * or null if no override exists for this component.
 *
 * @returns {{ tsxPath: string, meta: object } | null}
 */
function resolveLocalRegistry(component) {
  let registryBase;
  try {
    const req = createRequire(import.meta.url);
    registryBase = path.join(
      path.dirname(req.resolve("@forgewp/ui/package.json")),
      "components"
    );
  } catch {
    // Fallback for local monorepo development
    registryBase = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../ui/components"
    );
  }

  const componentDir = path.join(registryBase, component);
  const tsxPath = path.join(componentDir, "forgewp.tsx");
  const registryPath = path.join(componentDir, "registry.json");

  if (!existsSync(tsxPath) && !existsSync(registryPath)) return null;

  let meta = {};
  if (existsSync(registryPath)) {
    try {
      meta = JSON.parse(readFileSync(registryPath, "utf8"));
    } catch {
      // Malformed registry.json — proceed with empty meta
    }
  }

  return { tsxPath, meta };
}

/**
 * Ensures the given Tailwind CSS plugins are installed and registered
 * via `@plugin` in the project's globals.css file.
 *
 * This is used only for ForgeWP-native components whose Tailwind plugin
 * requirements are declared in their local registry.json — since shadcn's
 * remote registry handles this automatically for shadcn-sourced components.
 *
 * @param {string[]} plugins - Plugin package names (e.g. ["tailwindcss-animate"])
 * @param {string} installCmd - The detected package manager install command
 * @param {string} projectRoot
 */
async function ensureTailwindPlugins(plugins, installCmd, projectRoot) {
  const pkgJsonPath = path.join(projectRoot, "package.json");
  if (!existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  const currentDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  for (const plugin of plugins) {
    // Install if missing
    if (!currentDeps[plugin]) {
      console.log(pc.yellow(`\n  ⚡ Requires Tailwind plugin: ${pc.bold(plugin)}`));
      try {
        execSync(`${installCmd} ${plugin}`, {
          stdio: "inherit",
          cwd: projectRoot,
          shell: process.platform === "win32",
        });
        console.log(pc.green(`  ✅ Installed ${plugin}`));
      } catch (err) {
        console.log(pc.red(`  ❌ Failed to install ${plugin}: ${err.message}`));
        console.log(pc.yellow(`  Please manually run: ${installCmd} ${plugin}\n`));
        continue;
      }
    }

    // Register @plugin in globals.css if not already present
    const cssSearchPaths = [
      path.join(projectRoot, "src", "app", "globals.css"),
      path.join(projectRoot, "src", "styles", "globals.css"),
      path.join(projectRoot, "src", "index.css"),
      path.join(projectRoot, "src", "global.css"),
    ];

    const globalsPath = cssSearchPaths.find(p => existsSync(p));
    if (!globalsPath) {
      console.log(pc.yellow(`  ⚠  Could not find globals.css. Add manually: @plugin "${plugin}";`));
      continue;
    }

    let css = readFileSync(globalsPath, "utf8");
    const directive = `@plugin "${plugin}";`;
    if (css.includes(directive)) {
      console.log(pc.dim(`  ↳ ${plugin} already registered in ${path.basename(globalsPath)}`));
      continue;
    }

    // Insert after the last @import line
    const lines = css.split("\n");
    let lastImportIdx = -1;
    lines.forEach((line, i) => {
      if (line.trimStart().startsWith("@import")) lastImportIdx = i;
    });

    if (lastImportIdx !== -1) {
      lines.splice(lastImportIdx + 1, 0, directive);
    } else {
      lines.unshift(directive);
    }

    writeFileSync(globalsPath, lines.join("\n"), "utf8");
    console.log(pc.green(`  ✅ Registered @plugin "${plugin}" in ${path.basename(globalsPath)}`));
  }
}

/**
 * Applies the ForgeWP "sharp" neo-brutalist aesthetic transform to a component file.
 * Replaces all Tailwind rounding utilities with `rounded-none`.
 * Used only when the project's wp.config.ts sets style: "forgewp".
 */
function sharpenFile(filePath) {
  let content = readFileSync(filePath, "utf8");

  const sharpened = content.replace(
    /(?:\b|['"\s])([a-z0-9-:]+)?rounded(-[a-z0-9\[\]]+)?(?=["'\s])/g,
    (match) => {
      if (match.includes("rounded")) {
        const cleanPrefix = match.split("rounded")[0];
        return `${cleanPrefix}rounded-none`;
      }
      return match;
    }
  );

  if (content !== sharpened) {
    writeFileSync(filePath, sharpened, "utf8");
    console.log(pc.dim(`    Sharpened ${path.basename(filePath)}`));
  }
}
