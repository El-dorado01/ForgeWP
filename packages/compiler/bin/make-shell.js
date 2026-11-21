#!/usr/bin/env node

/**
 * forgewp make:shell
 *
 * Scaffold a parent shell block (InnerBlocks layout wrapper).
 * Interactively lists project blocks so you can pick default children.
 *
 * Usage:
 *   pnpm forgewp make:shell AboutSplitSection
 *   pnpm forgewp make:shell AboutSplitSection --children=about-mission,about-values --layout=2-col
 */

import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import {
  discoverProjectBlocks,
  SHELL_LAYOUT_PRESETS,
  DEFAULT_SHELL_CLASSNAME,
} from "../lib/blocks/discover-blocks.js";
import { blockAuthoringHelp } from "../lib/block-authoring-help.js";

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);

function getFlag(name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-")) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(name) {
  return args.includes(`--${name}`) || args.some((a) => a.startsWith(`--${name}=`));
}

function printHelp() {
  console.log(`
  ${c.bold("forgewp make:shell")} — scaffold a parent shell (InnerBlocks layout)

  ${c.bold("Usage:")}
    pnpm forgewp make:shell <Name>
    pnpm forgewp make:shell <Name> --children=block-a,block-b --layout=2-col

  ${c.bold("Options:")}
    --name <Name>              Shell block name (PascalCase or kebab)
    --children <slugs>         Comma-separated child block names (no forgewp/ prefix)
    --layout <preset>          ${Object.keys(SHELL_LAYOUT_PRESETS).join(" | ")} | custom
    --grid-class <classes>     Override grid className (implies custom layout)
    --class <classes>          Outer shell className (default: max-w-7xl + padding)
    --template-lock <mode>     false | insert | all | true  (default: false)
    --category <slug>          Block category (default: theme)
    --icon <dashicon>          Dashicon slug (default: columns)
    --description <text>       Block description
    --yes                      Skip interactive prompts when flags provide enough info
    -h, --help                 Show help

  ${c.bold("Examples:")}
    pnpm forgewp make:shell AboutSplitSection
    pnpm forgewp make:shell AboutSplitSection --children=about-mission,about-values --layout=2-col
    pnpm forgewp make:shell FeatureRow --layout=3-col --template-lock=insert
${blockAuthoringHelp}
`);
}

if (hasFlag("help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

let rawShellName =
  args.find((a) => !a.startsWith("-")) || getFlag("name") || "";

const projectRoot = process.cwd();
if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(ui.errorBlock("No src/ folder here.", "Run this from your theme project root."));
  process.exit(1);
}

const available = discoverProjectBlocks(projectRoot, { includeShells: false });

const rl = readline.createInterface({ input, output });

async function ask(prompt, fallback = "") {
  // Without a keyboard (CI, pipes) take the default instead of waiting forever.
  if (!process.stdin.isTTY) return fallback;
  const suffix = fallback !== "" ? c.dim(` (${fallback})`) : "";
  try {
    const answer = await rl.question(`  ${c.orange(ui.symbols.active)} ${prompt}${suffix}: `);
    const t = answer.trim();
    return t || fallback;
  } catch {
    return fallback;
  }
}

try {
  if (!rawShellName) {
    rawShellName = await ask("Shell block name (e.g. AboutSplitSection)");
  }

  if (!rawShellName) {
    console.error(ui.errorBlock("Missing shell name.", `Example: ${ui.command("pnpm forgewp make:shell AboutSplitSection")}`));
    process.exit(1);
  }

  const cleanName = rawShellName.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanName) {
    console.error(ui.errorBlock("Invalid shell name.", "Use letters, numbers, dashes and underscores."));
    process.exit(1);
  }

  const pascalCase = cleanName
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

  const nameSlug = pascalCase
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  const readableTitle = pascalCase
    .replace(/([A-Z])/g, " $1")
    .trim();

  // ── Children ────────────────────────────────────────────────────────────
  let childrenSlugs = [];
  const childrenFlag = getFlag("children");
  if (childrenFlag !== undefined) {
    childrenSlugs = childrenFlag
      .split(",")
      .map((s) => s.trim().replace(/^forgewp\//, ""))
      .filter(Boolean);
  } else if (!hasFlag("yes")) {
    console.log("");
    if (available.length === 0) {
      console.log(ui.warn("No blocks to nest yet"));
      console.log(`${ui.detail("Create some with make:block first, or continue with an empty shell and add children later.")}\n`);
    } else {
      console.log(`  ${c.bold("Blocks you can nest")}\n`);
      available.forEach((b, i) => {
        console.log(
          `    ${c.cyan(String(i + 1).padStart(2))}. ${c.bold(b.name)}  ${c.dim(`— ${b.title}`)}  ${c.dim(`(${b.file})`)}`,
        );
      });
      console.log(
        c.dim(
          "\n  Enter numbers or names, comma-separated. Leave empty for none.\n",
        ),
      );
      const pick = await ask(
        "Child blocks",
        "",
      );
      if (pick) {
        childrenSlugs = resolveChildPicks(pick, available);
      }
    }
  }

  // Validate children against discovered set (warn only — allows pre-declared slugs)
  const known = new Set(available.map((b) => b.name));
  for (const c of childrenSlugs) {
    if (!known.has(c)) {
      console.log(ui.warn(`"${c}" is not a known block`, "included anyway; make sure it exists before export"));
    }
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  let layoutKey = getFlag("layout") || "";
  let gridClassName = getFlag("grid-class") || getFlag("gridClassName") || "";
  let orientation = "horizontal";

  if (gridClassName) {
    layoutKey = "custom";
  } else if (!layoutKey && !hasFlag("yes")) {
    console.log(`\n  ${c.bold("Layout")}\n`);
    const keys = Object.keys(SHELL_LAYOUT_PRESETS);
    keys.forEach((k, i) => {
      console.log(
        `    ${c.cyan(String(i + 1))}. ${k} — ${SHELL_LAYOUT_PRESETS[k].label}`,
      );
    });
    console.log(`    ${c.cyan(String(keys.length + 1))}. custom — type your own grid classes`);
    const choice = await ask("Layout", "2-col");
    if (/^\d+$/.test(choice)) {
      const n = Number(choice);
      if (n >= 1 && n <= keys.length) layoutKey = keys[n - 1];
      else if (n === keys.length + 1) layoutKey = "custom";
      else layoutKey = "2-col";
    } else {
      layoutKey = choice in SHELL_LAYOUT_PRESETS || choice === "custom"
        ? choice
        : "2-col";
    }
  } else if (!layoutKey) {
    layoutKey = "2-col";
  }

  if (layoutKey === "custom" && !gridClassName) {
    gridClassName = await ask(
      "Grid className",
      "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center",
    );
    orientation = "horizontal";
  } else if (layoutKey !== "custom") {
    const preset =
      SHELL_LAYOUT_PRESETS[layoutKey] || SHELL_LAYOUT_PRESETS["2-col"];
    gridClassName = preset.gridClassName;
    orientation = preset.orientation || "horizontal";
  }

  // ── Outer chrome ────────────────────────────────────────────────────────
  let className = getFlag("class") || getFlag("className") || "";
  if (!className && !hasFlag("yes")) {
    className = await ask("Outer shell className", DEFAULT_SHELL_CLASSNAME);
  } else if (!className) {
    className = DEFAULT_SHELL_CLASSNAME;
  }

  // ── Template lock ───────────────────────────────────────────────────────
  let templateLockRaw =
    getFlag("template-lock") || getFlag("templateLock") || "";
  if (!templateLockRaw && !hasFlag("yes")) {
    templateLockRaw = await ask(
      "templateLock (false | insert | all | true)",
      "false",
    );
  } else if (!templateLockRaw) {
    templateLockRaw = "false";
  }
  const templateLock = parseTemplateLock(templateLockRaw);

  // ── Meta ────────────────────────────────────────────────────────────────
  let category = getFlag("category") || "";
  if (!category && !hasFlag("yes")) {
    category = await ask("Category", "theme");
  } else if (!category) {
    category = "theme";
  }

  let icon = getFlag("icon") || "";
  if (!icon && !hasFlag("yes")) {
    icon = await ask("Dashicon", "columns");
  } else if (!icon) {
    icon = "columns";
  }

  let description =
    getFlag("description") ||
    `Layout shell: ${readableTitle}${childrenSlugs.length ? ` (${childrenSlugs.join(" + ")})` : ""}`;

  if (!hasFlag("yes") && !getFlag("description")) {
    description = await ask("Description", description);
  }

  rl.close();

  // Load adapter
  let frameworkAdapter = "react";
  try {
    const config = await loadConfig(projectRoot);
    frameworkAdapter = config.frameworkAdapter || "react";
  } catch {
    // default
  }

  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;

  if (typeof adapter.onMakeShell !== "function") {
    console.error(ui.errorBlock(`The ${frameworkAdapter} adapter does not support make:shell.`));
    process.exit(1);
  }

  await adapter.onMakeShell(projectRoot, {
    pascalCase,
    nameSlug,
    readableTitle,
    childrenSlugs,
    shell: {
      className,
      gridClassName,
    },
    innerBlocks: {
      allowedBlocks: childrenSlugs.length > 0 ? childrenSlugs : undefined,
      template: childrenSlugs.map((slug) => [slug]),
      templateLock,
      orientation,
    },
    category,
    icon,
    description,
    pc: c,
  });
} catch (err) {
  try {
    rl.close();
  } catch {
    // ignore
  }
  console.error(ui.errorBlock("make:shell failed", err instanceof Error ? err.message : String(err)));
  process.exit(1);
}

/**
 * @param {string} pick
 * @param {import('../lib/blocks/discover-blocks.js').DiscoveredBlock[]} available
 */
function resolveChildPicks(pick, available) {
  const parts = pick.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      const idx = Number(p) - 1;
      if (idx >= 0 && idx < available.length) {
        const name = available[idx].name;
        if (!seen.has(name)) {
          seen.add(name);
          out.push(name);
        }
      } else {
        console.log(ui.warn(`Ignoring ${p}`, "not in the list"));
      }
      continue;
    }
    const slug = p.replace(/^forgewp\//, "");
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

function parseTemplateLock(raw) {
  const v = String(raw).trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no" || v === "none") return false;
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "all" || v === "insert") return v;
  return false;
}
