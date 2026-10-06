import { describe, expect, it } from 'vitest';
import { usesBlockArea } from '../../lib/hydration/uses-block-area.js';

describe('usesBlockArea', () => {
  it('detects a named BlockArea JSX use', () => {
    expect(
      usesBlockArea(`import { BlockArea } from '@forgewp/react';
        export function Page() { return <BlockArea name="purchase" />; }`),
    ).toBe(true);
  });

  it('detects an aliased BlockArea JSX use', () => {
    expect(
      usesBlockArea(`import { BlockArea as ContentSlot } from '@forgewp/react';
        export function Page() { return <ContentSlot name="purchase" />; }`),
    ).toBe(true);
  });

  it('ignores JSX examples in comments and unrelated imports', () => {
    expect(
      usesBlockArea(`import { WpHead } from '@forgewp/react';
        // <BlockArea name="example" />
        export function Page() { return <WpHead />; }`),
    ).toBe(false);
  });
});
