#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { SYSTEM_BLUEPRINTS } from "../lib/blueprints.js";

console.log(`\n🩺 ${pc.bold(pc.bgCyan(pc.black("  FORGEWP SYSTEM DOCTOR  ")))}\n`);

const projectRoot = process.cwd();
let issuesFound = 0;

function runCheck(name, fn) {
  process.stdout.write(`  Checking ${name.padEnd(45, ".")} `);
  try {
    const warning = fn();
    if (warning) {
      console.log(pc.yellow("⚠️  WARNING"));
      console.log(pc.yellow(`     👉 ${warning}`));
      issuesFound++;
    } else {
      console.log(pc.green("✅ OK"));
    }
  } catch (err) {
    console.log(pc.red("❌ FAILED"));
    console.log(pc.red(`     👉 Error: ${err.message}`));
    issuesFound++;
  }
}

// 1. Node Version Check
runCheck("Node.js Runtime Environment", () => {
  const major = parseInt(process.versions.node.split(".")[0], 10);
  if (major < 18) {
    return `Your Node version is v${process.version}. ForgeWP recommends Node v18+ for compiling React themes.`;
  }
  return null;
});

// 2. User Editable Files
runCheck("User Configuration & HTML Layout", () => {
  const critical = ["wp.config.ts", "package.json", "index.html", "src/main.tsx"];
  for (const f of critical) {
    if (!existsSync(path.join(projectRoot, f))) {
      throw new Error(`Critical file "${f}" is missing from project root!`);
    }
  }
  return null;
});

// 3. Database Check
runCheck("Mock Database Schema Integration", () => {
  const dbPath = path.join(projectRoot, "wordpress", "mock-data.json");
  if (!existsSync(dbPath)) {
    throw new Error(`Database "wordpress/mock-data.json" was not found!`);
  }
  try {
    JSON.parse(readFileSync(dbPath, "utf8"));
  } catch (err) {
    throw new Error(`Database "wordpress/mock-data.json" contains invalid JSON syntax!\n        Message: ${err.message}`);
  }
  return null;
});

// 4. System Files Integrity Check
runCheck("System Internal Framework Libraries", () => {
  const systemFiles = Object.keys(SYSTEM_BLUEPRINTS);
  const missing = [];
  for (const sf of systemFiles) {
    if (!existsSync(path.join(projectRoot, sf))) {
      missing.push(sf);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Framework internal files are missing: ${missing.join(", ")}\n        💡 Fix: Run "pnpm forgewp repair" to auto-heal system boundaries!`);
  }
  return null;
});

// 5. Tailwind Integration Check
runCheck("Tailwind Styling Architecture", () => {
  const cssFile1 = path.join(projectRoot, "src", "index.css");
  const cssFile2 = path.join(projectRoot, "src", "app", "globals.css");
  if (!existsSync(cssFile1) && !existsSync(cssFile2)) {
    return `Style sheet (src/index.css or src/app/globals.css) is missing. Please ensure your Tailwind styles are loaded.`;
  }
  return null;
});

// Final Diagnostic
console.log("\n" + "─".repeat(60));
if (issuesFound === 0) {
  console.log(pc.green(`\n🎉 ${pc.bold("SYSTEM HEALTHY:")} Your ForgeWP monorepo is in perfect condition!`));
  console.log(pc.cyan("   You are ready to compile, scaffold, and upload themes safely.\n"));
} else {
  console.log(pc.red(`\n❌ ${pc.bold("DIAGNOSTIC COMPLETED:")} Found ${issuesFound} active system issue(s).`));
  console.log(pc.yellow(`   💡 Tip: Follow the instructions above or run "pnpm forgewp repair" to auto-heal framework internals.\n`));
  process.exit(1);
}
