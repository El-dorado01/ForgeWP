import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  lintHydrationReadsInSource,
  lintReactHydrationReads,
} from '../../lib/lint-hydration-reads.js';

const REACT_SRC_DIR = path.resolve(import.meta.dirname, '../../../react/src');

describe('Hydration global read lint rule (Phase A)', () => {
  it('bans direct window.forgeWpHydration and window.forgeWpTranslations reads in packages/react/src outside native-source.ts', () => {
    const violations = lintReactHydrationReads(REACT_SRC_DIR);
    expect(
      violations,
      violations.map((v) => `${v.file}:${v.line}:${v.column} ${v.message}`).join('\n'),
    ).toEqual([]);
  });

  it('flags dot, optional-chaining, bracket, and bare global reads while ignoring comments and TS interfaces', () => {
    const badSource = `
      // Comment mentioning forgeWpHydration should not trigger
      interface GlobalStub { forgeWpHydration?: any; }
      export function bad() {
        const a = (window as any).forgeWpHydration?.siteSettings;
        const b = (window as any)['forgeWpTranslations'];
        const c = (globalThis as any).forgeWpHydration.restUrl;
        return [a, b, c];
      }
    `;
    const violations = lintHydrationReadsInSource(badSource, 'bad.ts');
    expect(violations.map((v) => v.symbol)).toEqual([
      'forgeWpHydration',
      'forgeWpTranslations',
      'forgeWpHydration',
    ]);
  });
});
