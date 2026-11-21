#!/usr/bin/env node
/**
 * forgewp sync-hooks
 *
 * Propagates the canonical src/.forgewp/wordpress.tsx template to every
 * ForgeWP project in the workspace that contains a src/.forgewp/ directory.
 *
 * Usage:
 *   pnpm forgewp sync-hooks              # sync all projects
 *   pnpm forgewp sync-hooks --dry-run    # preview without writing
 *   pnpm forgewp sync-hooks --verbose    # show skipped projects too
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createUi } from "../lib/terminal-ui.js";

const ui = createUi();
const { c } = ui;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI flags ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const isDryRun = argv.includes("--dry-run") || argv.includes("-n");
const isVerbose = argv.includes("--verbose") || argv.includes("-v");

// ── Banner ─────────────────────────────────────────────────────────────────────
console.log(ui.header("sync:hooks", isDryRun ? "dry run · nothing is written" : "share wordpress.tsx across projects"));

// ── Locate the canonical template (source of truth) ───────────────────────────
const canonicalTemplatePath = path.resolve(
  __dirname,
  "..",
  "templates",
  "wordpress.tsx"
);

if (!existsSync(canonicalTemplatePath)) {
  console.error(ui.errorBlock("Source template not found", canonicalTemplatePath));
  process.exit(1);
}

const canonicalContent = readFileSync(canonicalTemplatePath, "utf8");
const canonicalHash = md5(canonicalContent);

console.log(ui.info("Source", `packages/compiler/templates/wordpress.tsx · ${canonicalHash.slice(0, 12)}`));

// ── Find workspace root (directory containing pnpm-workspace.yaml) ─────────────
function findWorkspaceRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const projectRoot = process.cwd();
const workspaceRoot = findWorkspaceRoot(projectRoot) || projectRoot;

console.log(`${ui.info("Workspace", workspaceRoot)}\n`);

// ── Collect candidate project directories ─────────────────────────────────────
function collectProjectDirs(workspaceRoot) {
  const dirs = new Set();

  // 1. Parse pnpm-workspace.yaml for declared packages
  const workspaceYaml = path.join(workspaceRoot, "pnpm-workspace.yaml");
  if (existsSync(workspaceYaml)) {
    const raw = readFileSync(workspaceYaml, "utf8");
    // Simple line-by-line parse — handles "  - "pattern-or-glob" entries
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s+-\s+"?([^"#\s]+)"?\s*$/);
      if (!match) continue;
      const pattern = match[1].trim();
      if (pattern.startsWith("!")) continue; // exclusion — handled below

      if (pattern.endsWith("/*")) {
        // Glob: enumerate immediate children
        const base = path.join(workspaceRoot, pattern.slice(0, -2));
        if (existsSync(base)) {
          for (const entry of readdirSync(base)) {
            const full = path.join(base, entry);
            if (statSync(full).isDirectory()) dirs.add(full);
          }
        }
      } else {
        // Literal path
        const full = path.join(workspaceRoot, pattern);
        if (existsSync(full)) dirs.add(full);
      }
    }
  }

  // 2. Always include template scaffold directories (excluded from workspace installs
  //    but still need to be kept in sync as they seed new projects)
  const extraTemplates = [
    path.join(workspaceRoot, "packages", "create-forgewp", "template"),
    path.join(workspaceRoot, "packages", "create-forgewp", "template-html"),
  ];
  for (const t of extraTemplates) {
    if (existsSync(t)) dirs.add(t);
  }

  return [...dirs];
}

const candidateDirs = collectProjectDirs(workspaceRoot);

// ── Sync logic ─────────────────────────────────────────────────────────────────
const TARGET_RELATIVE = path.join("src", ".forgewp", "wordpress.tsx");

let updatedCount = 0;
let alreadyCurrentCount = 0;
let skippedCount = 0;

for (const dir of candidateDirs) {
  const targetPath = path.join(dir, TARGET_RELATIVE);
  const relativeDir = path.relative(workspaceRoot, dir);

  // Skip if this dir doesn't have a src/.forgewp/ at all — it's not a ForgeWP theme
  if (!existsSync(path.dirname(targetPath))) {
    if (isVerbose) {
      console.log(ui.detail(`Skipped ${relativeDir} (not a ForgeWP theme)`));
    }
    skippedCount++;
    continue;
  }

  // Skip the compiler's own templates directory to avoid self-overwrite
  if (dir === path.resolve(__dirname, "..")) {
    if (isVerbose) {
      console.log(ui.detail(`Skipped ${relativeDir} (source package)`));
    }
    skippedCount++;
    continue;
  }

  if (existsSync(targetPath)) {
    const existingContent = readFileSync(targetPath, "utf8");
    const existingHash = md5(existingContent);

    if (existingHash === canonicalHash) {
      if (isVerbose) {
        console.log(ui.done("Up to date", relativeDir));
      }
      alreadyCurrentCount++;
      continue;
    }
  }

  // Write update
  if (!isDryRun) {
    writeFileSync(targetPath, canonicalContent, "utf8");
  }

  const updatedPath = `${relativeDir}/${TARGET_RELATIVE}`.replace(/\\/g, "/");
  console.log(isDryRun ? ui.info("Would update", updatedPath) : ui.done("Updated", updatedPath));
  updatedCount++;
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("");
if (updatedCount === 0 && alreadyCurrentCount > 0) {
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold("Everything is up to date")}  ${c.dim(`${alreadyCurrentCount} project${alreadyCurrentCount === 1 ? "" : "s"} checked`)}\n`);
} else if (isDryRun) {
  console.log(`  ${c.cyan(ui.symbols.info)} ${c.bold(`${updatedCount} file${updatedCount === 1 ? "" : "s"} would be updated`)}  ${c.dim(`${alreadyCurrentCount} already current · dry run`)}\n`);
} else {
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold(`Updated ${updatedCount} project${updatedCount === 1 ? "" : "s"}`)}  ${c.dim(`${alreadyCurrentCount} already current · ${skippedCount} skipped`)}\n`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function md5(content) {
  return createHash("md5").update(content).digest("hex");
}
