import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_NEXTJS_TEMPLATE_FILES,
  REQUIRED_TEMPLATE_FILES,
} from './template-files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COPY_EXCLUDE = new Set([
  'node_modules',
  'dist',
  '.next',
  'out',
  '.vite',
  '.forgewp',
  'package-lock.json',
]);

export function resolveTemplateDir(adapter = 'react') {
  const folderName =
    adapter === 'html'
      ? 'template-html'
      : adapter === 'nextjs'
        ? 'template-nextjs'
        : 'template';

  const bundled = path.join(__dirname, '..', folderName);
  if (existsSync(bundled)) {
    validateTemplateDir(bundled, adapter);
    return bundled;
  }

  if (adapter === 'nextjs') {
    throw new Error(
      `ForgeWP Next.js template not found at ${bundled}.`,
    );
  }

  const fromStarter = path.join(
    __dirname,
    '..',
    '..',
    adapter === 'html' ? 'html-starter' : 'starter',
  );
  if (existsSync(fromStarter)) {
    return fromStarter;
  }

  throw new Error(
    'ForgeWP template not found. Run: pnpm sync:template from the ForgeWP repo.',
  );
}

/**
 * @param {string} templateDir
 * @param {string} [adapter]
 */
export function validateTemplateDir(templateDir, adapter = 'react') {
  const required =
    adapter === 'nextjs'
      ? REQUIRED_NEXTJS_TEMPLATE_FILES
      : REQUIRED_TEMPLATE_FILES;
  const missing = required.filter(
    (file) => !existsSync(path.join(templateDir, file)),
  );

  if (missing.length > 0) {
    throw new Error(
      `CLI template is incomplete (missing: ${missing.join(', ')}).\n` +
        'From the ForgeWP repo root, run: pnpm sync:template',
    );
  }
}

export function copyTemplate(targetDir, adapter = 'react') {
  const templateDir = resolveTemplateDir(adapter);

  mkdirSync(targetDir, { recursive: true });

  cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const relative = path.relative(templateDir, src);
      const parts = relative.split(path.sep);
      if (parts.length > 0 && COPY_EXCLUDE.has(parts[0])) {
        return false;
      }
      return true;
    },
  });
}
