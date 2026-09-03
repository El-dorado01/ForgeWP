#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";

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

if (!rawName) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(pc.cyan("? Enter a post type name: "));
    rawName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawName) {
  console.error(pc.red("\n❌ Error: Please specify a post type name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:post-type portfolio"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:post-type --name portfolio\n"));
  process.exit(1);
}

// WordPress slugs should be lowercase alphanumeric with dashes or underscores
const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
if (!cleanName) {
  console.error(pc.red("\n❌ Error: Invalid post type name. Use letters, numbers, dashes, and underscores.\n"));
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
      console.warn(pc.yellow(`\n⚠️  Post type "${cleanName}" already exists in cms/mock-data.ts.`));
      console.log(`   You can open the file directly to view or edit existing fields.\n`);
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
      console.error(pc.red(`\n❌ Error: Failed to parse cms/mock-data.json. Enforcing clean file.`));
      mockData = {};
    }
  }

  if (mockData[cleanName]) {
    console.warn(pc.yellow(`\n⚠️  Post type "${cleanName}" already exists in cms/mock-data.json.`));
    console.log(`   You can open the file directly to view or edit existing fields.\n`);
    process.exit(0);
  }

  mockData[cleanName] = seedItems;
  writeFileSync(mockDataJsonPath, JSON.stringify(mockData, null, 2), "utf8");
}

const suggestedField = customFieldsList.length > 0 ? customFieldsList[0] : "client_name";

console.log(pc.green(`\n⚡ Post Type "${cleanName}" successfully registered!`));
console.log(`   Local DB: ${pc.cyan(activeFile)}`);
console.log(`\n🎉 Query your seeded fields in React inside:`);
console.log(`   ${pc.yellow(`<WpQueryLoop postType="${cleanName}" postsPerPage={2}>`)}`);
console.log(`     ${pc.yellow(`<h3>{useWpTitle()}</h3>`)}`);
console.log(`     ${pc.yellow(`<p>${suggestedField.charAt(0).toUpperCase() + suggestedField.slice(1)}: {useWpCustomField("${suggestedField}")}</p>`)}`);
console.log(`   ${pc.yellow(`</WpQueryLoop>`)}\n`);
