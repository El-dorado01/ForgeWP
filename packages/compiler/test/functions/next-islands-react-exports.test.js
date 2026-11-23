/**
 * Regression (cloud E2E): an island importing anything from '@forgewp/react'
 * pulled in html-react-parser, which reads `import { version } from 'react'`.
 * The window.React shim only re-exported a hand-picked hook list, so `version`
 * was undefined and the island crashed with "Cannot read properties of
 * undefined (reading 'split')". The shim now re-exports every named export of
 * the installed React.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { windowReactExportNames } from '../../lib/next-islands.js';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('window.React island shim exports', () => {
  it('re-exports every named export of the installed React, including version', () => {
    const names = windowReactExportNames(pkgRoot);
    for (const name of ['version', 'useSyncExternalStore', 'startTransition', 'Suspense', 'createElement', 'useState']) {
      expect(names).toContain(name);
    }
    expect(names).not.toContain('default');
    expect(names.every((n) => /^[A-Za-z_$][\w$]*$/.test(n))).toBe(true);
  });

  it('falls back to a safe list when React cannot be resolved', () => {
    const names = windowReactExportNames('/nonexistent-forgewp-dir');
    expect(names).toContain('version');
    expect(names).toContain('useSyncExternalStore');
  });
});
