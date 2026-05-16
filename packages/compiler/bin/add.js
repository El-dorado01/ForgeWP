#!/usr/bin/env node
import { addComponent } from "../lib/add-component.js";

const args = process.argv.slice(2);
const component = args[0];
const style = args.find(a => a.startsWith("--style="))?.split("=")[1] || "forgewp";

if (!component) {
  console.error("Usage: forgewp:add <component> [--style=forgewp|shadcn]");
  process.exit(1);
}

addComponent(component, { style }).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
