#!/usr/bin/env node
import { addComponent } from '../lib/add-component.js';

const args = process.argv.slice(2);
let components = args.filter((a) => !a.startsWith('-'));

// Support --name navbar or --name=navbar
const nameIndex = args.indexOf('--name');
if (nameIndex !== -1 && args[nameIndex + 1]) {
  components.push(args[nameIndex + 1]);
} else {
  const nameEqual = args.find((a) => a.startsWith('--name='));
  if (nameEqual) {
    components.push(nameEqual.split('=')[1]);
  }
}

// Clean and deduplicate the component list
components = Array.from(
  new Set(components.map((c) => c.trim()).filter(Boolean)),
);

import { readFileSync, existsSync } from 'node:fs';
import { findWpConfigPath } from '../lib/project-language.js';

let projectStyle = 'forgewp';
try {
  // Read wp.config.{ts,js,mjs} natively by regexing the 'style' property
  const wpConfigPath = findWpConfigPath(process.cwd())?.path;
  if (wpConfigPath && existsSync(wpConfigPath)) {
    const content = readFileSync(wpConfigPath, 'utf8');
    const styleMatch = content.match(/style:\s*['"](forgewp|shadcn)['"]/);
    if (styleMatch && styleMatch[1]) {
      projectStyle = styleMatch[1];
    }
  }
} catch (e) {
  // Silent fallback
}

const style =
  args.find((a) => a.startsWith('--style='))?.split('=')[1] || projectStyle;
const overwrite = args.includes('--overwrite');

if (components.length === 0) {
  console.error(
    'Usage: forgewp add <component1> [component2] ... [--style=forgewp|shadcn] [--overwrite]',
  );
  process.exit(1);
}

async function run() {
  for (const component of components) {
    await addComponent(component, { style, overwrite });
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
