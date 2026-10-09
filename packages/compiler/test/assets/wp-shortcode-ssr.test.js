import { describe, expect, it } from 'vitest';
import { WpShortcode } from '../../../react/src/components/WpShortcode.tsx';

describe('WpShortcode server rendering', () => {
  it('emits a compiler marker without browser globals', () => {
    const originalWindow = globalThis.window;
    delete globalThis.window;

    try {
      const marker = WpShortcode({ code: '[events_list limit="3"]' });

      expect(marker.type).toBe('forgewp-shortcode');
      expect(marker.props.code).toBe('[events_list limit="3"]');
    } finally {
      if (originalWindow !== undefined) {
        globalThis.window = originalWindow;
      }
    }
  });

  it('keeps the placeholder in a normal browser preview', () => {
    const originalWindow = globalThis.window;
    globalThis.window = {};

    try {
      const preview = WpShortcode({ code: '[events_list limit="3"]' });

      expect(preview.type).toBe('div');
    } finally {
      if (originalWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
    }
  });
});
