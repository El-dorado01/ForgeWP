import { mkdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');

/**
 * Link the workspace `@forgewp/react` and `@forgewp/compiler` packages into a
 * project scaffolded with `--no-install`, so its `wp.config` can resolve
 * `@forgewp/compiler/define-config`. Junctions need no elevation on Windows.
 *
 * @param {string} projectDir
 */
export function linkWorkspaceForgeWPPackages(projectDir) {
  const scopeDir = path.join(projectDir, 'node_modules', '@forgewp');
  mkdirSync(scopeDir, { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  for (const pkg of ['react', 'compiler']) {
    symlinkSync(path.join(repoRoot, 'packages', pkg), path.join(scopeDir, pkg), linkType);
  }
}
