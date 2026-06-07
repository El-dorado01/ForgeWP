import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readTemplate = (name) => fs.readFileSync(path.join(__dirname, '..', 'templates', name), 'utf8');

export const SYSTEM_BLUEPRINTS = {
  'cms/menus.json': readTemplate('menus.json'),
  'cms/mock-data.json': readTemplate('mock-data.json'),
  'src/.forgewp/forgewp-config.ts': readTemplate('forgewp-config.ts'),
  'src/.forgewp/wordpress.tsx': readTemplate('wordpress.tsx'),
  'src/.forgewp/SEO.tsx': readTemplate('SEO.tsx'),
  'src/.forgewp/PresetsStyle.tsx': readTemplate('PresetsStyle.tsx'),
};
