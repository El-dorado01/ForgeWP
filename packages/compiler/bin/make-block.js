#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const args = process.argv.slice(2);
let rawBlockName = args.find(a => !a.startsWith("-"));

// Support --name TestimonialBlock or --name=TestimonialBlock
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawBlockName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawBlockName = nameEqual.split("=")[1];
  }
}

if (!rawBlockName) {
  console.error(pc.red("\n❌ Error: Please specify a block name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:block TestimonialBlock"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:block --name TestimonialBlock\n"));
  process.exit(1);
}

// 1. Sanitize & convert to PascalCase and kebab-case
const cleanName = rawBlockName.replace(/[^a-zA-Z0-9_-]/g, "");
if (!cleanName) {
  console.error(pc.red("\n❌ Error: Invalid block name. Use letters, numbers, dashes, and underscores.\n"));
  process.exit(1);
}

// Convert to PascalCase: e.g., testimonial-block -> TestimonialBlock
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

// Convert to Gutenberg Title: e.g., TestimonialBlock -> Testimonial Block
const readableTitle = pascalCase
  .replace(/([A-Z])/g, " $1")
  .trim();

// Ensure we are inside a ForgeWP theme workspace
const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

// 2. Parse custom attributes if provided via --attributes or --attrs
let attributesList = ["title", "description"];
const attrsArg = args.find(a => /^-+attributes=/.test(a) || /^-+attrs=/.test(a));
if (attrsArg) {
  const rawAttrs = attrsArg.split("=")[1];
  if (rawAttrs) {
    attributesList = rawAttrs.split(",").map(a => a.trim()).filter(Boolean);
  }
} else {
  const attrsIndex = args.findIndex(a => /^-+attributes$/.test(a) || /^-+attrs$/.test(a));
  if (attrsIndex !== -1 && args[attrsIndex + 1]) {
    attributesList = args[attrsIndex + 1].split(",").map(a => a.trim()).filter(Boolean);
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
  if (typeof adapter.onMakeBlock === "function") {
    await adapter.onMakeBlock(projectRoot, {
      pascalCase,
      readableTitle,
      attributesList,
      pc
    });
  } else {
    console.error(pc.red(`\n❌ Error: Framework adapter "${frameworkAdapter}" does not support making Gutenberg blocks.`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute make:block: ${err.message}`));
  process.exit(1);
}

