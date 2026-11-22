#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createUi } from '../lib/terminal-ui.js';

import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);
let rawName = args.find(a => !a.startsWith("-"));

// Support --name Contact or --name=Contact
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
    const answer = await rl.question(`  ${c.orange(ui.symbols.active)} Enter a form name (e.g. Contact or contact): `);
    rawName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawName) {
  console.error(ui.errorBlock("Missing form name.", `Example: ${ui.command("pnpm forgewp make:form Contact --fields=name:text,email:email")}`));
  process.exit(1);
}

// kebab-case slug, matching the cms/forms/<slug>.ts convention
// (mirrors cms/editables/<slug>.ts's filename-as-key convention)
const slug = rawName
  .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
  .replace(/[\s_]+/g, "-")
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "");

if (!slug) {
  console.error(ui.errorBlock("Invalid form name.", "Use letters, numbers, dashes and underscores."));
  process.exit(1);
}

const pascalCase = slug
  .split("-")
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join("");

const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(ui.errorBlock("No src/ folder here.", "Run this from your theme project root."));
  process.exit(1);
}

const existingFormExt = [".ts", ".js", ".mjs"].find((ext) =>
  existsSync(path.join(projectRoot, "cms", "forms", `${slug}${ext}`)),
);
if (existingFormExt) {
  console.error(ui.errorBlock(`Already exists: cms/forms/${slug}${existingFormExt}`, "Choose a different name, or edit the existing form."));
  process.exit(1);
}

// Parse --fields=name:type,name2:type2 (type defaults to "text" when omitted)
const VALID_TYPES = ["text", "email", "tel", "number", "textarea", "select", "multiselect", "radio", "checkbox", "hidden"];
let fieldsList = [];
const fieldsArg = args.find(a => /^-+fields=/.test(a));
const fieldsRaw = fieldsArg
  ? fieldsArg.split("=")[1] || ""
  : (() => {
      const i = args.findIndex(a => a === "--fields");
      return i !== -1 && args[i + 1] ? args[i + 1] : "";
    })();

if (fieldsRaw) {
  fieldsList = fieldsRaw.split(",").map(f => f.trim()).filter(Boolean).map(f => {
    const [fieldName, fieldType] = f.split(":").map(s => s.trim());
    const type = VALID_TYPES.includes(fieldType) ? fieldType : "text";
    return { name: fieldName, type };
  });
} else {
  fieldsList = [
    { name: "name", type: "text" },
    { name: "email", type: "email" },
    { name: "message", type: "textarea" },
  ];
}

// Parse --mailTo=admin (or a literal email / option:key — see WpFormConfig.mailTo)
let mailTo = "admin";
const mailToArg = args.find(a => a.startsWith("--mailTo="));
if (mailToArg) {
  mailTo = mailToArg.split("=")[1] || "admin";
}

const projectRootForConfig = process.cwd();

let frameworkAdapter = "react";
try {
  const config = await loadConfig(projectRootForConfig);
  frameworkAdapter = config.frameworkAdapter || "react";
} catch (err) {
  // Use default
}

try {
  const adapterModule = await loadFrameworkAdapter(frameworkAdapter);
  const adapter = adapterModule.default || adapterModule;
  if (typeof adapter.onMakeForm === "function") {
    await adapter.onMakeForm(projectRoot, {
      slug,
      pascalCase,
      fields: fieldsList,
      mailTo,
      pc: c,
    });
  } else {
    console.error(ui.errorBlock(`The ${frameworkAdapter} adapter does not support make:form.`));
    process.exit(1);
  }
} catch (err) {
  console.error(ui.errorBlock("make:form failed", err.message));
  process.exit(1);
}
