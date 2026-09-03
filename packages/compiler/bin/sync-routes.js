#!/usr/bin/env node

import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { loadMenusData } from "../lib/functions/load-menus.js";

console.log(`\n⚡ ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SITEMAP COMPILER (SYNC:ROUTES)  ")))}\n`);

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const isForce = args.includes("--force") || args.includes("--override");

// 1. Locate menus configuration file (cms/menus.ts preferred, cms/menus.json fallback)
const menusTsPath = path.join(projectRoot, "cms", "menus.ts");
const menusPath = path.join(projectRoot, "cms", "menus.json");
let menus = loadMenusData(projectRoot);

const hasMenuLocations = Object.keys(menus).some((k) => !k.startsWith("_") && Array.isArray(menus[k]));

if (hasMenuLocations) {
  if (existsSync(menusTsPath)) {
    console.log(`  📖 ${pc.green("Loaded sitemap source")}: cms/menus.ts`);
  } else {
    console.log(`  📖 ${pc.green("Loaded sitemap source")}: cms/menus.json`);
  }
} else {
  menus = {
    _comment: "⚡ ForgeWP Navigation Menus — Edit this file to add/remove links in local dev. Run 'pnpm forgewp sync:routes' to auto-scaffold corresponding React pages!",
    primary: [
      { title: "Home", url: "/" },
      { title: "New", url: "/new" },
      { title: "Men", url: "/men" },
      { title: "Women", url: "/women" }
    ],
    utility: [
      { title: "Help", url: "/help" },
      { title: "Sign In", url: "/login" }
    ]
  };

  const dir = path.dirname(menusPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(menusPath, JSON.stringify(menus, null, 2), "utf8");
  console.log(`  🎉 ${pc.green("Created dedicated sitemap source")}: cms/menus.json`);
}

// 2. Extract unique local paths and sanitize them recursively
const routesToScaffold = [];
const seenUrls = new Set(["/", ""]);

function extractRoutesFromItems(items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item && item.url && typeof item.url === "string") {
      let url = item.url.trim();

      // Skip external, anchors, mailto, etc.
      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://") &&
        !url.startsWith("#") &&
        !url.startsWith("mailto:") &&
        !url.startsWith("tel:")
      ) {
        // Normalize starting slash
        if (!url.startsWith("/")) {
          url = "/" + url;
        }

        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          routesToScaffold.push({
            path: url,
            title: item.title || url.replace("/", "")
          });
        }
      }
    }

    if (item && Array.isArray(item.children)) {
      extractRoutesFromItems(item.children);
    }
  }
}

for (const [location, items] of Object.entries(menus)) {
  if (!location.startsWith("_")) {
    extractRoutesFromItems(items);
  }
}

if (routesToScaffold.length === 0) {
  console.log(pc.yellow(`\nℹ️ No local pages to synchronize inside your sitemap menu config.`));
  process.exit(0);
}

// Load configuration and invoke adapter
let frameworkAdapter = "react";
try {
  const config = await loadConfig(projectRoot);
  frameworkAdapter = config.frameworkAdapter || "react";
} catch (err) {
  // Use default
}

try {
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;
  if (typeof adapter.onSyncRoutes === "function") {
    await adapter.onSyncRoutes(projectRoot, {
      routesToScaffold,
      isForce,
      pc
    });
  } else {
    console.log(pc.yellow(`  ⚠️  No sync:routes hook implemented for framework adapter: ${frameworkAdapter}`));
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute sync:routes: ${err.message}`));
  process.exit(1);
}
