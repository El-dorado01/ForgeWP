import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const starterRequire = createRequire(path.resolve(__dirname, '../packages/starter/package.json'));

const reactPath = starterRequire.resolve('react');
console.log('React path resolved from starter:', reactPath);

const jiti = createJiti(import.meta.url, {
  jsx: true,
  alias: {
    'react': reactPath
  }
});

const jitiReact = await jiti.import('react');
const originalReact = starterRequire('react');

console.log('Are jitiReact and originalReact the same instance?', jitiReact === originalReact);

const components = await jiti.import('../packages/auth/src/components.tsx');
console.log('Components loaded successfully!');
