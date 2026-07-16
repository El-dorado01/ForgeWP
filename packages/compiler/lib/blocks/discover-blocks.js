/**
 * Discover Gutenberg blocks already defined in a theme (defineBlock + @forgewp-block).
 * Used by make:shell to offer child block multi-select.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseDefineBlock, parseJsdocMetaLine } from "./scanner.js";

/**
 * @typedef {{ name: string, title: string, category: string, isShell: boolean, source: string, file: string }} DiscoveredBlock
 */

/**
 * @param {string} themeRoot
 * @param {{ includeShells?: boolean }} [options]
 * @returns {DiscoveredBlock[]}
 */
export function discoverProjectBlocks(themeRoot, options = {}) {
  const { includeShells = false } = options;
  const srcDir = path.join(themeRoot, "src");
  if (!existsSync(srcDir)) return [];

  const files = [];
  function collect(dir) {
    if (!existsSync(dir)) return;
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (
          ["node_modules", ".forgewp", "dist", ".git", "out"].includes(item.name)
        ) {
          continue;
        }
        // Still walk generated/ — those are real blocks
        collect(full);
      } else if (
        item.isFile() &&
        (item.name.endsWith(".tsx") || item.name.endsWith(".jsx"))
      ) {
        files.push(full);
      }
    }
  }
  collect(srcDir);

  /** @type {Map<string, DiscoveredBlock>} */
  const byName = new Map();

  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    // defineBlock({ ... })
    if (content.includes("defineBlock(")) {
      const rel = path.relative(themeRoot, file);
      const slugGuess = path.basename(file, path.extname(file))
        .replace(/Block$/i, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const parsed = parseDefineBlock(content, slugGuess);
      if (parsed && parsed.name) {
        const name = stripNs(String(parsed.name));
        const isShell = !!(parsed.innerBlocks && typeof parsed.innerBlocks === "object");
        if (!includeShells && isShell) {
          // still record shells when includeShells; skip leaf filter later
        }
        byName.set(name, {
          name,
          title: String(parsed.title || name),
          category: String(parsed.category || "design"),
          isShell,
          source: "defineBlock",
          file: rel,
        });
      }
    }

    // @forgewp-block annotated components (generated into blocks/generated)
    if (content.includes("@forgewp-block")) {
      const blockRegex =
        /\/\*\*((?:(?!\*\/)[\s\S])*?@forgewp-block(?:(?!\*\/)[\s\S])*?)\*\/[\s\r\n]*(?:export\s+(?:interface|type)\s+[A-Za-z0-9_$-]+\s*=?\s*\{[\s\S]*?\}[\s\r\n]*)?export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_$-]+)/g;
      let match;
      while ((match = blockRegex.exec(content)) !== null) {
        const jsdoc = match[1];
        const compName = match[2];
        if (!jsdoc.includes("@forgewp-block")) continue;
        const name = compName
          .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        // Prefer explicit defineBlock entries if both exist
        if (byName.has(name)) continue;
        byName.set(name, {
          name,
          title: parseJsdocMetaLine(jsdoc, "title") || compName,
          category: parseJsdocMetaLine(jsdoc, "category") || "design",
          isShell: false,
          source: "@forgewp-block",
          file: path.relative(themeRoot, file),
        });
      }
    }
  }

  let list = Array.from(byName.values());
  if (!includeShells) {
    list = list.filter((b) => !b.isShell);
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function stripNs(name) {
  if (!name) return name;
  return name.includes("/") ? name.split("/").pop() : name;
}

/**
 * Layout presets for shell.gridClassName
 */
export const SHELL_LAYOUT_PRESETS = {
  "2-col": {
    label: "Two columns (responsive)",
    gridClassName:
      "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center",
    orientation: "horizontal",
  },
  "3-col": {
    label: "Three columns (responsive)",
    gridClassName: "grid grid-cols-1 md:grid-cols-3 gap-8",
    orientation: "horizontal",
  },
  stack: {
    label: "Vertical stack",
    gridClassName: "flex flex-col gap-8",
    orientation: "vertical",
  },
};

export const DEFAULT_SHELL_CLASSNAME =
  "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16";
