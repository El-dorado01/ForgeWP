import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * npm never publishes `.gitignore` files, so templates installed from the registry
 * arrive without one. These defaults mirror each template's own `.gitignore`
 * (kept in sync by test/functions/create-forgewp-gitignore.test.js).
 */
const REACT_GITIGNORE = `node_modules
dist
.forgewp
.forgewp-islands
*.local
.DS_Store
Thumbs.db
.env
.env.*
!.env.example
*.log
.vite
`;

const NEXTJS_GITIGNORE = `node_modules/
.next/
out/
.forgewp/
next-env.d.ts
*.tsbuildinfo
`;

export const DEFAULT_GITIGNORE = {
  react: REACT_GITIGNORE,
  html: REACT_GITIGNORE,
  nextjs: NEXTJS_GITIGNORE,
};

/**
 * Write a `.gitignore` into a freshly scaffolded project when the template did not
 * bring one (always the case for templates installed from npm).
 * @param {string} targetDir
 * @param {string} [adapter]
 * @returns {boolean} true when a file was written
 */
export function ensureGitignore(targetDir, adapter = 'react') {
  const file = path.join(targetDir, '.gitignore');
  if (existsSync(file)) return false;
  writeFileSync(file, DEFAULT_GITIGNORE[adapter] ?? REACT_GITIGNORE, 'utf8');
  return true;
}
