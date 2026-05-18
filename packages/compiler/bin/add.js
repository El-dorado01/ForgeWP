#!/usr/bin/env node
import { addComponent } from "../lib/add-component.js";

const args = process.argv.slice(2);
let component = args.find(a => !a.startsWith("-"));

// Support --name navbar or --name=navbar
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && args[nameIndex + 1]) {
  component = args[nameIndex + 1];
} else {
  const nameEqual = args.find(a => a.startsWith("--name="));
  if (nameEqual) {
    component = nameEqual.split("=")[1];
  }
}

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

let projectStyle = "forgewp";
try {
  // Read wp.config.ts natively by regexing the 'style' property since it's a TS file
  const wpConfigPath = path.join(process.cwd(), "wp.config.ts");
  if (existsSync(wpConfigPath)) {
    const content = readFileSync(wpConfigPath, "utf8");
    const styleMatch = content.match(/style:\s*['"](forgewp|shadcn)['"]/);
    if (styleMatch && styleMatch[1]) {
      projectStyle = styleMatch[1];
    }
  }
} catch (e) {
  // Silent fallback
}

const style = args.find(a => a.startsWith("--style="))?.split("=")[1] || projectStyle;

if (!component) {
  console.error("Usage: forgewp add <component> [--style=forgewp|shadcn] or forgewp add --name <component>");
  process.exit(1);
}

addComponent(component, { style }).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
