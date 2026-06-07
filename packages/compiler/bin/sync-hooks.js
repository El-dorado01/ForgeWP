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
import pc from "picocolors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI flags ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const isDryRun = argv.includes("--dry-run") || argv.includes("-n");
const isVerbose = argv.includes("--verbose") || argv.includes("-v");

// ── Banner ─────────────────────────────────────────────────────────────────────
console.log(
  `\n🔄 ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SYNC-HOOKS  ")))} ${
    isDryRun ? pc.yellow("[DRY RUN — no files will be written]") : ""
  }\n`
);

// ── Locate the canonical template (source of truth) ───────────────────────────
const canonicalTemplatePath = path.resolve(
  __dirname,
  "..",
  "templates",
  "wordpress.tsx"
);

if (!existsSync(canonicalTemplatePath)) {
  console.error(
    pc.red(
      `\n❌ Cannot find canonical template at:\n   ${canonicalTemplatePath}\n`
    )
  );
  process.exit(1);
}

const canonicalContent = readFileSync(canonicalTemplatePath, "utf8");
const canonicalHash = md5(canonicalContent);

console.log(
  `  ${pc.bold("Source:")} ${pc.cyan("packages/compiler/templates/wordpress.tsx")}`
);
console.log(`  ${pc.bold("Hash:")}   ${pc.dim(canonicalHash.slice(0, 12))}...\n`);

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

console.log(`  ${pc.bold("Workspace:")} ${pc.dim(workspaceRoot)}\n`);

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
      console.log(
        `  ${pc.dim("⊘  Skipped")} ${pc.dim(relativeDir)} ${pc.dim("(no src/.forgewp/)")}`
      );
    }
    skippedCount++;
    continue;
  }

  // Skip the compiler's own templates directory to avoid self-overwrite
  if (dir === path.resolve(__dirname, "..")) {
    if (isVerbose) {
      console.log(`  ${pc.dim("⊘  Skipped")} ${pc.dim(relativeDir)} ${pc.dim("(source package)")}`);
    }
    skippedCount++;
    continue;
  }

  if (existsSync(targetPath)) {
    const existingContent = readFileSync(targetPath, "utf8");
    const existingHash = md5(existingContent);

    if (existingHash === canonicalHash) {
      if (isVerbose) {
        console.log(
          `  ${pc.green("✓  Up-to-date")} ${pc.cyan(relativeDir)}`
        );
      }
      alreadyCurrentCount++;
      continue;
    }
  }

  // Write update
  if (!isDryRun) {
    writeFileSync(targetPath, canonicalContent, "utf8");
  }

  console.log(
    `  ${isDryRun ? pc.yellow("~  Would update") : pc.green("✅ Updated")}  ${pc.cyan(relativeDir + "/" + TARGET_RELATIVE.replace(/\\/g, "/"))}`
  );
  updatedCount++;
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));

if (updatedCount === 0 && alreadyCurrentCount > 0) {
  console.log(
    pc.green(
      `\n✨ ${pc.bold("All projects are already up-to-date.")} (${alreadyCurrentCount} checked)\n`
    )
  );
} else if (isDryRun) {
  console.log(
    pc.yellow(
      `\n🔍 ${pc.bold("Dry run complete.")} ${updatedCount} file(s) would be updated, ${alreadyCurrentCount} already current.\n`
    )
  );
} else {
  const total = updatedCount + alreadyCurrentCount + skippedCount;
  console.log(
    pc.green(
      `\n🎉 ${pc.bold("Sync complete!")} Updated ${pc.bold(String(updatedCount))} project(s). ${alreadyCurrentCount} already current. ${skippedCount} non-theme packages skipped.\n`
    )
  );
  if (updatedCount > 0) {
    console.log(
      pc.cyan(
        `   All projects now share the same wordpress.tsx hooks — zero drift.\n`
      )
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function md5(content) {
  return createHash("md5").update(content).digest("hex");
}
