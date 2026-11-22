#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { createUi } from "../lib/terminal-ui.js";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { findWpConfigPath } from "../lib/project-language.js";

const ui = createUi();
const { c } = ui;

/**
 * `forgewp fresh` returns a project to exactly what create-forgewp scaffolded:
 * everything the generators create is removed, then the adapter restores the
 * starter files in the project's language (see the adapter's onFresh).
 */

// Folders the generators (make:*, sync:routes, make:sandbox) create.
const GENERATED_DIRS = [
  "src/app/pages",
  "src/blocks",
  "src/components",
  "src/loops",
  "cms/forms",
  "cms/editables",
  "cms/mail",
];
// Individual generated files: post-type/archive/taxonomy templates and auth sandbox data.
const GENERATED_FILES = [
  { dir: "src/app", match: /^(single|archive|taxonomy)-.+\.(tsx|jsx|ts|js)$/ },
  { dir: "cms", match: /^(users|sessions|roles|email-logs)\.(json|ts|js|mjs)$/ },
];
const CACHE_DIRS = [".forgewp", "dist", ".vite"];
// Starter-owned files inside GENERATED_DIRS: fresh restores them, so they are not "your work".
const STARTER_OWNED = /^src\/(blocks\/IntroBlock|components\/(brand-logos|theme-hotkey))\.(tsx|jsx|ts|js)$/;

const projectRoot = process.cwd();
const isForce = ["--force", "-f", "-y", "--yes"].some((flag) => process.argv.includes(flag));
const toRel = (abs) => path.relative(projectRoot, abs).replaceAll("\\", "/");

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/** Everything fresh will delete: generated folders and files that exist right now. */
function collectTargets() {
  const dirs = [];
  const files = [];
  for (const rel of GENERATED_DIRS) {
    const full = path.join(projectRoot, rel);
    if (existsSync(full) && statSync(full).isDirectory()) {
      dirs.push(full);
      files.push(...listFiles(full));
    }
  }
  const looseFiles = [];
  for (const { dir, match } of GENERATED_FILES) {
    const full = path.join(projectRoot, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full)) {
      const file = path.join(full, name);
      if (match.test(name) && statSync(file).isFile()) looseFiles.push(file);
    }
  }
  files.push(...looseFiles);
  const yourWork = files.map(toRel).filter((rel) => !STARTER_OWNED.test(rel)).sort();
  return { dirs, looseFiles, yourWork };
}

async function loadAdapter() {
  let frameworkAdapter = "react";
  try {
    const config = await loadConfig(projectRoot);
    frameworkAdapter = config.frameworkAdapter || "react";
  } catch (err) {
    const configFile = findWpConfigPath(projectRoot)?.fileName || "wp.config.ts (or wp.config.js)";
    console.log(ui.warn(`Could not load ${configFile}`, `${err.message} · assuming the react adapter`));
  }
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  return { frameworkAdapter, adapter: adapterModule.default || adapterModule };
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n  ${c.orange(ui.symbols.active)} ${question} ${c.dim("(y/N)")} `, (answer) => {
      rl.close();
      resolve(["y", "yes"].includes(answer.trim().toLowerCase()));
    });
  });
}

async function main() {
  console.log(ui.header("fresh", "reset to the starter"));

  const { frameworkAdapter, adapter } = await loadAdapter();
  // Refuse before deleting anything if this adapter cannot put the starter back.
  if (!adapter.freshRestoresStarter || typeof adapter.onFresh !== "function") {
    console.log(ui.errorBlock(
      `fresh isn't available for the ${frameworkAdapter} adapter yet. Nothing was changed.`,
      "Use version control to return to your starter files, e.g. git checkout and git clean.",
    ));
    process.exit(1);
  }

  const { dirs, looseFiles, yourWork } = collectTargets();

  if (yourWork.length > 0 && !isForce) {
    const preview = yourWork.slice(0, 8).map((rel) => ui.detail(rel));
    if (yourWork.length > 8) preview.push(ui.detail(`and ${yourWork.length - 8} more`));
    if (!process.stdin.isTTY) {
      console.log(ui.errorBlock(
        `fresh would delete ${yourWork.length} file${yourWork.length === 1 ? "" : "s"} you created.`,
        `To confirm without a prompt, run ${ui.command("pnpm forgewp fresh --force")}`,
      ));
      process.exit(1);
    }
    console.log(ui.warn(`This permanently deletes ${yourWork.length} file${yourWork.length === 1 ? "" : "s"} you created:`));
    for (const line of preview) console.log(line);
    if (!(await confirm("Reset to the starter?"))) {
      console.log(`\n${ui.info("Cancelled. Nothing was changed.")}\n`);
      process.exit(0);
    }
    console.log("");
  }

  // 1. Build caches and output
  for (const folder of CACHE_DIRS) {
    const target = path.join(projectRoot, folder);
    if (!existsSync(target)) continue;
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(ui.done("Cleared", `${folder}/`));
    } catch (err) {
      console.log(ui.error(`Could not clear ${folder}/`, err.message));
    }
  }

  // 2. Everything the generators created
  for (const dir of dirs) {
    try {
      const count = listFiles(dir).length;
      rmSync(dir, { recursive: true, force: true });
      console.log(ui.done("Removed", `${toRel(dir)}/  ${c.dim(`${count} file${count === 1 ? "" : "s"}`)}`));
    } catch (err) {
      console.log(ui.error(`Could not remove ${toRel(dir)}/`, err.message));
    }
  }
  for (const file of looseFiles) {
    try {
      rmSync(file, { force: true });
      console.log(ui.done("Removed", toRel(file)));
    } catch (err) {
      console.log(ui.error(`Could not remove ${toRel(file)}`, err.message));
    }
  }

  // 3. Starter files, in the project's language
  await adapter.onFresh(projectRoot);

  // Inside the ForgeWP monorepo, keep the CLI template in sync with packages/starter.
  const monorepoSyncScript = path.join(projectRoot, "..", "..", "scripts", "sync-cli-template.mjs");
  if (existsSync(monorepoSyncScript)) {
    try {
      spawnSync("node", [monorepoSyncScript], { stdio: "ignore", shell: process.platform === "win32" });
    } catch {
      // Development convenience only.
    }
  }

  console.log("");
  console.log(`  ${c.green(ui.symbols.done)} ${c.bold("Reset to the starter")}`);
  console.log(`${ui.hint("Next", `${ui.command("pnpm dev")} ${c.dim("to see the welcome page")}`)}\n`);
}

main().catch((err) => {
  console.error(ui.errorBlock("fresh failed", err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
