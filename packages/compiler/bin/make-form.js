#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";
import { loadConfig } from "../lib/load-config.js";
import { loadFrameworkAdapter } from "../lib/framework-adapter.js";

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

if (!rawName) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(pc.cyan("? Enter a form name (e.g. Contact or contact): "));
    rawName = answer.trim();
  } catch (err) {}
  rl.close();
}

if (!rawName) {
  console.error(pc.red("\n❌ Error: Please specify a form name."));
  console.log(pc.cyan("   Example: pnpm forgewp make:form Contact"));
  console.log(pc.cyan("   Or:      pnpm forgewp make:form --name Contact\n"));
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
  console.error(pc.red("\n❌ Error: Invalid form name. Use letters, numbers, dashes, and underscores.\n"));
  process.exit(1);
}

const pascalCase = slug
  .split("-")
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join("");

const projectRoot = process.cwd();

if (!existsSync(path.join(projectRoot, "src"))) {
  console.error(pc.red(`\n❌ Error: "src" folder not found. Are you in your theme's root directory?\n`));
  process.exit(1);
}

if (existsSync(path.join(projectRoot, "cms", "forms", `${slug}.ts`))) {
  console.error(pc.red(`\n❌ Error: Form "${slug}.ts" already exists at cms/forms/\n`));
  process.exit(1);
}

// Parse --fields=name:type,name2:type2 (type defaults to "text" when omitted)
const VALID_TYPES = ["text", "email", "tel", "number", "textarea", "select", "checkbox"];
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
      pc,
    });
  } else {
    console.error(pc.red(`\n❌ Error: Framework adapter "${frameworkAdapter}" does not support making forms.`));
    process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`\n❌ Failed to execute make:form: ${err.message}`));
  process.exit(1);
}
