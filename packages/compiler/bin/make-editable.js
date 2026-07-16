#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";

const args = process.argv.slice(2);
let rawName = args.find(a => !a.startsWith("-"));

// Support --name AboutPage or --name=AboutPage
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
    const answer = await rl.question(pc.cyan("? Enter a schema name (e.g. AboutPage or about-page): "));
    rawName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawName) {
  console.error(pc.red("\n❌ Error: Please specify a schema name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:editable AboutPage"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:editable --name AboutPage\n"));
  process.exit(1);
}

// kebab-case slug, matching the cms/editables/<slug>.ts convention
// (front-page.ts, hotels-page.ts, …)
const slug = rawName
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .replace(/[\s_]+/g, "-")
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "");

if (!slug) {
  console.error(pc.red("\n❌ Error: Invalid schema name. Use letters, numbers, dashes, and underscores.\n"));
  process.exit(1);
}

const readableTitle = slug
  .split("-")
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(" ");

const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

// Parse --fields=name:type,name2:type2 (type defaults to "text" when omitted)
const VALID_TYPES = ["text", "richText", "image", "boolean", "repeater", "color", "url", "select", "number", "icon"];
let fieldsList = [];
const fieldsArg = args.find(a => /^-+fields=/.test(a));
if (fieldsArg) {
  const raw = fieldsArg.split("=")[1] || "";
  fieldsList = raw.split(",").map(f => f.trim()).filter(Boolean).map(f => {
    const [fieldName, fieldType] = f.split(":").map(s => s.trim());
    const type = VALID_TYPES.includes(fieldType) ? fieldType : "text";
    return { name: fieldName, type };
  });
} else {
  const fieldsIndex = args.findIndex(a => a === "--fields");
  if (fieldsIndex !== -1 && args[fieldsIndex + 1]) {
    fieldsList = args[fieldsIndex + 1].split(",").map(f => f.trim()).filter(Boolean).map(f => {
      const [fieldName, fieldType] = f.split(":").map(s => s.trim());
      const type = VALID_TYPES.includes(fieldType) ? fieldType : "text";
      return { name: fieldName, type };
    });
  }
}

if (fieldsList.length === 0) {
  fieldsList = [
    { name: "hero_title", type: "text" },
    { name: "hero_subtitle", type: "text" },
  ];
}

const editablesDir = path.join(projectRoot, "cms", "editables");
if (!existsSync(editablesDir)) {
  mkdirSync(editablesDir, { recursive: true });
}

const targetFile = path.join(editablesDir, `${slug}.ts`);
if (existsSync(targetFile)) {
  console.error(pc.red(`\n❌ Error: Schema "${slug}.ts" already exists at cms/editables/\n`));
  process.exit(1);
}

const toLabel = (name) =>
  name
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const usedTypes = Array.from(new Set(fieldsList.map(f => f.type))).sort();
const importList = ["defineEditable", "getEditableDefaults", ...usedTypes].join(",\n  ");

const fieldsPhp = fieldsList
  .map(({ name, type }) => {
    const label = toLabel(name);
    if (type === "image") {
      return `  ${name}: image({
    label: '${label}',
    default: '',
  }),`;
    }
    if (type === "boolean") {
      return `  ${name}: boolean({
    label: '${label}',
    default: false,
  }),`;
    }
    return `  ${name}: ${type}({
    label: '${label}',
    default: 'Edit me',
  }),`;
  })
  .join("\n");

const schemaTemplate = `/**
 * ${readableTitle} — single editable contract.
 *
 * Source of truth for:
 *  - ACF field group (page-${slug}.php)
 *  - useWpMeta defaults on this template's section components
 *
 * Read a field with useWpMeta('key', defaults.key), or share a subset with
 * a Gutenberg block via pickEditable(editable, { localName: 'key' }).
 *
 * Available field helpers: text, richText, image, boolean, repeater,
 * color, url, select, number, icon — import the ones you use above.
 */
import {
  ${importList},
} from '@forgewp/react';

export const editable = defineEditable({
${fieldsPhp}
});

export const defaults = getEditableDefaults(editable);
`;

writeFileSync(targetFile, schemaTemplate, "utf8");

console.log(pc.green(`\n⚡ Editable schema "${slug}" successfully created!`));
console.log(`   File: ${pc.cyan(`cms/editables/${slug}.ts`)}`);
console.log(`\n🎉 Use it in a page or section component:`);
console.log(`   ${pc.yellow(`import { editable, defaults } from '../../cms/editables/${slug}';`)}`);
console.log(`   ${pc.yellow(`const ${fieldsList[0].name} = useWpMeta('${fieldsList[0].name}', defaults.${fieldsList[0].name});`)}\n`);
