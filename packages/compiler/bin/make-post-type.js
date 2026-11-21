#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { createUi } from '../lib/terminal-ui.js';

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);
let rawName = args.find(a => !a.startsWith("-"));

// Support --name portfolio or --name=portfolio
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  rawName = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    rawName = nameEqual.split("=")[1];
  }
}

// Only ask when someone is at the keyboard; otherwise fall through to the missing-name error.
if (!rawName && process.stdin.isTTY) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`  ${c.orange(ui.symbols.active)} Post type name: `);
    rawName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawName) {
  console.error(ui.errorBlock("Missing post type name.", `Example: ${ui.command("pnpm forgewp make:post-type portfolio")}`));
  process.exit(1);
}

// WordPress slugs should be lowercase alphanumeric with dashes or underscores
const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
if (!cleanName) {
  console.error(ui.errorBlock("Invalid post type name.", "Use lowercase letters, numbers, dashes and underscores."));
  process.exit(1);
}

const projectRoot = process.cwd();
const wpDir = path.join(projectRoot, "cms");
const mockDataTsPath = path.join(wpDir, "mock-data.ts");
const mockDataJsonPath = path.join(wpDir, "mock-data.json");
const isTs = existsSync(mockDataTsPath) || !existsSync(mockDataJsonPath);
const activeFile = isTs ? "cms/mock-data.ts" : "cms/mock-data.json";

// Ensure cms directory exists
if (!existsSync(wpDir)) {
  mkdirSync(wpDir, { recursive: true });
}

// Parse custom fields if provided via --customFields, -customFields, --custom-fields, etc.
let customFieldsList = [];
const fieldsArg = args.find(a => /^-+custom[Ff]ields=/.test(a) || /^-+custom-fields=/.test(a));
if (fieldsArg) {
  const rawFields = fieldsArg.split("=")[1];
  if (rawFields) {
    customFieldsList = rawFields.split(",").map(f => f.trim()).filter(Boolean);
  }
} else {
  const fieldsIndex = args.findIndex(a => /^-+custom[Ff]ields$/.test(a) || /^-+custom-fields$/.test(a));
  if (fieldsIndex !== -1 && args[fieldsIndex + 1]) {
    customFieldsList = args[fieldsIndex + 1].split(",").map(f => f.trim()).filter(Boolean);
  }
}

// Generate seeded customFields object
const seededCustomFields1 = {};
const seededCustomFields2 = {};

if (customFieldsList.length > 0) {
  for (const field of customFieldsList) {
    seededCustomFields1[field] = `[Seeded ${field} 1]`;
    seededCustomFields2[field] = `[Seeded ${field} 2]`;
  }
} else {
  seededCustomFields1["client_name"] = "Mock Enterprise";
  seededCustomFields1["project_budget"] = "$30,000";

  seededCustomFields2["client_name"] = "Mock Organization";
  seededCustomFields2["project_budget"] = "$55,000";
}

const cleanTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const seedItems = [
  {
    id: 1,
    title: `Sample ${cleanTitle} Item 1`,
    excerpt: `This is a custom ${cleanName} post seeded dynamically via ForgeWP CLI.`,
    content: `<p>Welcome to your new custom <strong>${cleanName}</strong> post template! Edit this in ${activeFile}.</p>`,
    date: dateStr,
    author: "ForgeWP CLI",
    featuredImage: `https://picsum.photos/seed/${cleanName}1/1200/630`,
    customFields: seededCustomFields1
  },
  {
    id: 2,
    title: `Sample ${cleanTitle} Item 2`,
    excerpt: `This is another custom ${cleanName} post seeded dynamically via ForgeWP CLI.`,
    content: `<p>This is the second custom post for the ${cleanName} post type.</p>`,
    date: dateStr,
    author: "ForgeWP CLI",
    featuredImage: `https://picsum.photos/seed/${cleanName}2/1200/630`,
    customFields: seededCustomFields2
  }
];

if (isTs) {
  if (existsSync(mockDataTsPath)) {
    let content = readFileSync(mockDataTsPath, "utf8");
    if (content.includes(`"${cleanName}":`) || content.includes(`${cleanName}:`)) {
      console.warn(`\n${ui.warn(`Post type "${cleanName}" already exists`, "cms/mock-data.ts")}`);
      console.log(`${ui.detail("Open the file to view or edit its fields.")}\n`);
      process.exit(0);
    }

    const snippet = `  ${cleanName}: ${JSON.stringify(seedItems, null, 4).replace(/^/gm, "  ").trim()},\n`;
    if (content.includes("defineWpPosts({")) {
      content = content.replace("defineWpPosts({", "defineWpPosts({\n" + snippet);
    } else if (content.lastIndexOf("};") !== -1) {
      const idx = content.lastIndexOf("};");
      content = content.slice(0, idx) + snippet + content.slice(idx);
    } else {
      content += `\n\n// Added custom post type: ${cleanName}\n${snippet}`;
    }
    writeFileSync(mockDataTsPath, content, "utf8");
  } else {
    const defaultTs = `import { defineWpPosts } from '@forgewp/react';\n\nexport const mockData = defineWpPosts({\n  post: [],\n  ${cleanName}: ${JSON.stringify(seedItems, null, 4).replace(/^/gm, "  ").trim()}\n});\n\nexport default mockData;\n`;
    writeFileSync(mockDataTsPath, defaultTs, "utf8");
  }
} else {
  let mockData = {};
  if (existsSync(mockDataJsonPath)) {
    try {
      mockData = JSON.parse(readFileSync(mockDataJsonPath, "utf8"));
    } catch (err) {
      console.error(`\n${ui.warn("cms/mock-data.json could not be parsed", "starting from an empty file")}`);
      mockData = {};
    }
  }

  if (mockData[cleanName]) {
    console.warn(`\n${ui.warn(`Post type "${cleanName}" already exists`, "cms/mock-data.json")}`);
    console.log(`${ui.detail("Open the file to view or edit its fields.")}\n`);
    process.exit(0);
  }

  mockData[cleanName] = seedItems;
  writeFileSync(mockDataJsonPath, JSON.stringify(mockData, null, 2), "utf8");
}

const suggestedField = customFieldsList.length > 0 ? customFieldsList[0] : "client_name";

console.log(`\n${ui.created("post type", cleanName, activeFile)}`);
console.log(ui.detail("Seeded with two sample posts. Query them in a page:"));
console.log(`      ${ui.command(`<WpQueryLoop postType="${cleanName}" postsPerPage={2}>`)}`);
console.log(`        ${ui.command(`<h3>{useWpTitle()}</h3>`)}`);
console.log(`        ${ui.command(`<p>{useWpCustomField("${suggestedField}")}</p>`)}`);
console.log(`      ${ui.command(`</WpQueryLoop>`)}\n`);
