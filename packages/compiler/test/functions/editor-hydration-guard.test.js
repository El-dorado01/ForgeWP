/**
 * Regression (cloud E2E, WordPress 7.1, Next.js adapter): forgewp_enqueue_assets
 * runs on enqueue_block_assets, which also fires inside the block editor. The
 * island runtime assigned window.React (React 19) there, replacing core's React
 * and crashing the editor with React error #525 (blank editor). Theme CSS must
 * still reach the editor; the runtime/hydrator must not.
 */
import { describe, it, expect } from 'vitest';
import { buildHydrationEnqueuerPhp } from '../../lib/functions/hydration-enqueuer.js';

function build() {
  return buildHydrationEnqueuerPhp(
    { textDomain: 'test_theme' }, { cssFile: 'assets/main.css' }, 'assets/islands/react-runtime.js',
    new Set(), [], '', '', '', '', '', '', '', '', '', 'usernameAndEmail', '',
  );
}

describe('forgewp_enqueue_assets in the block editor', () => {
  it('enqueues theme CSS before returning early in wp-admin, and the runtime only after the guard', () => {
    const php = build();
    const fnStart = php.indexOf('function forgewp_enqueue_assets()');
    const css = php.indexOf("'test_theme-app'", fnStart);
    const guard = php.indexOf('if (is_admin()) {\n        return;\n    }', fnStart);
    const runtime = php.indexOf("'test_theme-react-runtime'", fnStart);
    expect(fnStart).toBeGreaterThan(-1);
    expect(css).toBeGreaterThan(fnStart);
    expect(guard).toBeGreaterThan(css);
    expect(runtime).toBeGreaterThan(guard);
    expect(php).toContain("add_action('enqueue_block_assets', 'forgewp_enqueue_assets');");
  });
});
