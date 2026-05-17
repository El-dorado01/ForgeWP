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

const style = args.find(a => a.startsWith("--style="))?.split("=")[1] || "forgewp";

if (!component) {
  console.error("Usage: forgewp add <component> [--style=forgewp|shadcn] or forgewp add --name <component>");
  process.exit(1);
}

addComponent(component, { style }).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
