#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";
import { loadMockData } from "../lib/functions/seed-mock-data.js";

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);
let rawLoopName = args.find(a => !a.startsWith("-"));

// Support --name PortfolioGrid or --name=PortfolioGrid
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawLoopName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawLoopName = nameEqual.split("=")[1];
  }
}

// Only ask when someone is at the keyboard; otherwise fall through to the missing-name error.
if (!rawLoopName && process.stdin.isTTY) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`  ${c.orange(ui.symbols.active)} Enter a loop name: `);
    rawLoopName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawLoopName) {
  console.error(ui.errorBlock("Missing loop name.", `Example: ${ui.command("pnpm forgewp make:loop PortfolioGrid --postType=portfolio")}`));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawLoopName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(ui.errorBlock("Invalid loop name.", "Use letters, numbers, dashes and underscores."));
  process.exit(1);
}

// Parse postType
let postType = "post";
const postTypeArg = args.find(a => a.startsWith("--postType=") || a.startsWith("--post-type="));
if (postTypeArg) {
  postType = postTypeArg.split("=")[1];
} else {
  const postTypeIndex = args.findIndex(a => a === "--postType" || a === "--post-type");
  if (postTypeIndex !== -1 && args[postTypeIndex + 1]) {
    postType = args[postTypeIndex + 1];
  }
}

const projectRoot = process.cwd();
const hasScriptMockData = ["mock-data.ts", "mock-data.js", "mock-data.mjs"].some((name) =>
  existsSync(path.join(projectRoot, "cms", name)),
);
const mockDataJsonPath = path.join(projectRoot, "cms", "mock-data.json");

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(ui.errorBlock("No src/ folder here.", "Run this from your theme project root."));
  process.exit(1);
}

// Load custom fields from cms/mock-data.{ts,js,mjs} (preferred) or mock-data.json
let customFields = [];
let automaticallySeeded = false;
const mockData = { ...loadMockData(projectRoot) };
const existingRecords = mockData[postType] || [];

if (existingRecords.length > 0 && existingRecords[0].customFields) {
  customFields = Object.keys(existingRecords[0].customFields);
} else if (!mockData[postType] && existsSync(mockDataJsonPath) && !hasScriptMockData) {
  try {
    mockData[postType] = [
      {
        id: 1,
        title: `Sample ${postType.charAt(0).toUpperCase() + postType.slice(1)} Item 1`,
        excerpt: `This is a custom ${postType} post seeded dynamically via ForgeWP CLI.`,
        content: `<p>Welcome to your new custom <strong>${postType}</strong> post loop! Edit this in cms/mock-data.json.</p>`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        author: "ForgeWP CLI",
        featuredImage: `https://picsum.photos/seed/${postType}1/1200/630`,
        customFields: {
          client_name: "Mock Enterprise",
          project_budget: "$30,000",
        }
      },
      {
        id: 2,
        title: `Sample ${postType.charAt(0).toUpperCase() + postType.slice(1)} Item 2`,
        excerpt: `This is another custom ${postType} post seeded dynamically via ForgeWP CLI.`,
        content: `<p>This is the second custom post for the ${postType} post type.</p>`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        author: "ForgeWP CLI",
        featuredImage: `https://picsum.photos/seed/${postType}2/1200/630`,
        customFields: {
          client_name: "Mock Organization",
          project_budget: "$55,000",
        }
      }
    ];
    writeFileSync(mockDataJsonPath, JSON.stringify(mockData, null, 2), "utf8");
    automaticallySeeded = true;
    customFields = Object.keys(mockData[postType][0].customFields);
  } catch (err) {
    // Ignore and fallback
  }
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
  if (typeof adapter.onMakeLoop === "function") {
    await adapter.onMakeLoop(projectRoot, {
      pascalCase,
      postType,
      customFields,
      automaticallySeeded,
      pc: c
    });
  } else {
    console.error(ui.errorBlock(`The ${frameworkAdapter} adapter does not support make:loop.`));
    process.exit(1);
  }
} catch (err) {
  console.error(ui.errorBlock("make:loop failed", err.message));
  process.exit(1);
}
