#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

console.log(`\n⚡ ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SITEMAP COMPILER (SYNC:ROUTES)  ")))}\n`);

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const isForce = args.includes("--force") || args.includes("--override");

// 1. Locate menus configuration file
let menusPath = path.join(projectRoot, "cms", "menus.json");
let menus = null;

if (!existsSync(menusPath)) {
  // Try fallback in mock-data.json
  const mockDataPath = path.join(projectRoot, "cms", "mock-data.json");
  if (existsSync(mockDataPath)) {
    try {
      const mockData = JSON.parse(readFileSync(mockDataPath, "utf8"));
      if (mockData.menu) {
        menus = mockData.menu;
        console.log(`  ℹ️  Using legacy menus block inside: cms/mock-data.json`);
      }
    } catch (e) {
      // Ignored
    }
  }
  if (!menus) {
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
} else {
  try {
    menus = JSON.parse(readFileSync(menusPath, "utf8"));
    console.log(`  📖 ${pc.green("Loaded sitemap source")}: cms/menus.json`);
  } catch (err) {
    console.error(pc.red(`\n❌ Error: Failed to parse cms/menus.json.\nReason: ${err.message}`));
    process.exit(1);
  }
}

// 2. Extract unique local paths and sanitize them
const routesToScaffold = [];
const seenUrls = new Set(["/", ""]);

for (const [location, items] of Object.entries(menus)) {
  if (!Array.isArray(items)) continue;
  for (const item of items) {
    if (!item.url || typeof item.url !== "string") continue;
    let url = item.url.trim();

    // Skip external, anchors, mailto, etc.
    if (
      url.startsWith("http://") || 
      url.startsWith("https://") || 
      url.startsWith("#") || 
      url.startsWith("mailto:") || 
      url.startsWith("tel:")
    ) {
      continue;
    }

    // Normalize starting slash
    if (!url.startsWith("/")) {
      url = "/" + url;
    }

    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    routesToScaffold.push({
      path: url,
      title: item.title || url.replace("/", "")
    });
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
