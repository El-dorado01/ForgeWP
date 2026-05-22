#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const args = process.argv.slice(2);
let rawTemplateName = args.find(a => !a.startsWith("-"));

// Support --name PortfolioTemplate or --name=PortfolioTemplate
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawTemplateName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawTemplateName = nameEqual.split("=")[1];
  }
}

// Check for legacy alias warning
if (process.env.FORGEWP_LEGACY_ALIAS === "1") {
  console.log(pc.yellow(`\n⚠️  Legacy Command Warning: "make:component" is deprecated.`));
  console.log(`   Please use the new modern naming: ${pc.cyan("pnpm forgewp make:template <Name>")}\n`);
}

if (!rawTemplateName) {
  console.error(pc.red("\n❌ Error: Please specify a template name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:template PortfolioTemplate --postType=portfolio"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:template --name PortfolioTemplate --postType=portfolio\n"));
  process.exit(1);
}

// PascalCase formatting
const cleanName = rawTemplateName.replace(/[^a-zA-Z0-9_-]/g, "");
const pascalCase = cleanName
  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
  .replace(/[^a-zA-Z0-9]/g, "");

if (!pascalCase) {
  console.error(pc.red("\n❌ Error: Invalid template name.\n"));
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
const mockDataPath = path.join(projectRoot, "cms", "mock-data.json");

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

// Try to load custom fields from mock-data.json for this post type
let customFields = [];
let automaticallySeeded = false;

if (existsSync(mockDataPath)) {
  try {
    const mockData = JSON.parse(readFileSync(mockDataPath, "utf8"));
    if (!mockData[postType]) {
      // SMART ACTION: Automatically register and seed postType records in the JSON database
      mockData[postType] = [
        {
          id: 1,
          title: `Sample ${postType.charAt(0).toUpperCase() + postType.slice(1)} Item 1`,
          excerpt: `This is a custom ${postType} post seeded dynamically via ForgeWP CLI.`,
          content: `<p>Welcome to your new custom <strong>${postType}</strong> post template! Edit this in cms/mock-data.json.</p>`,
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
      // Save updated JSON
      writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2), "utf8");
      automaticallySeeded = true;
    }

    const records = mockData[postType] || [];
    if (records.length > 0 && records[0].customFields) {
      customFields = Object.keys(records[0].customFields);
    }
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
  if (typeof adapter.onMakeTemplate === "function") {
    await adapter.onMakeTemplate(projectRoot, {
      pascalCase,
      postType,
      customFields,
      automaticallySeeded,
      pc
    });
  } else {
    console.error(pc.red(`\n❌ Error: Framework adapter "${frameworkAdapter}" does not support making custom templates.`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute make:template: ${err.message}`));
  process.exit(1);
}
