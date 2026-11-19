import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_BLUEPRINTS } from '../../packages/compiler/lib/blueprints.js';

const wordpressBlueprint = SYSTEM_BLUEPRINTS['src/.forgewp/wordpress.tsx'];

if (!wordpressBlueprint) {
  console.error('Error: src/.forgewp/wordpress.tsx blueprint not found in blueprints.js');
  process.exit(1);
}

const targetPaths = [
  path.resolve('packages/starter/src/.forgewp/wordpress.tsx'),
  path.resolve('hotelchecker24/src/.forgewp/wordpress.tsx'),
  path.resolve('comfortable-decor/src/.forgewp/wordpress.tsx'),
  path.resolve('packages/create-forgewp/template/src/.forgewp/wordpress.tsx')
];

for (const targetPath of targetPaths) {
  console.log(`Syncing blueprint to: ${targetPath}`);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, wordpressBlueprint, 'utf8');
  console.log(`✔ Successfully synced wordpress.tsx to ${targetPath}`);
}
