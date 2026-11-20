import { describe, expect, it, vi } from 'vitest';

const { loadFrameworkAdapter } = vi.hoisted(() => ({ loadFrameworkAdapter: vi.fn() }));
vi.mock('../../lib/framework-adapter.js', () => ({ loadFrameworkAdapter }));
import { buildAdapterAssets } from '../../lib/adapter-build.js';

describe('adapter build dispatch', () => {
  it('awaits an adapter build and forwards build settings', async () => {
    const assets = { cssFile: 'custom/style.css', jsFile: 'custom/client.js' };
    const buildAssets = vi.fn().mockResolvedValue(assets);
    const readBuildAssets = vi.fn();
    loadFrameworkAdapter.mockResolvedValue({ buildAssets, readBuildAssets });
    expect(await buildAdapterAssets('/theme', 'custom', { packageManager: 'npm', verbose: true })).toBe(assets);
    expect(loadFrameworkAdapter).toHaveBeenLastCalledWith('custom');
    expect(buildAssets).toHaveBeenCalledWith('/theme', { packageManager: 'npm', verbose: true });
    expect(readBuildAssets).not.toHaveBeenCalled();
  });

  it('skipBuild reads existing assets without executing a build', async () => {
    const buildAssets = vi.fn();
    const assets = { cssFile: 'style.css' };
    const readBuildAssets = vi.fn().mockResolvedValue(assets);
    loadFrameworkAdapter.mockResolvedValue({ buildAssets, readBuildAssets });
    expect(await buildAdapterAssets('/theme', undefined, { skipBuild: true })).toBe(assets);
    expect(loadFrameworkAdapter).toHaveBeenLastCalledWith('react');
    expect(buildAssets).not.toHaveBeenCalled();
    expect(readBuildAssets).toHaveBeenCalledOnce();
  });

  it.each([false, true])('reports missing hooks without falling back to Vite (skipBuild=%s)', async (skipBuild) => {
    loadFrameworkAdapter.mockResolvedValue({});
    await expect(buildAdapterAssets('/theme', 'stub', { skipBuild })).rejects.toThrow(
      `Framework adapter "stub" does not implement ${skipBuild ? 'readBuildAssets' : 'buildAssets'}().`,
    );
  });

  it.each([undefined, {}, { cssFile: '' }, { cssFile: 'a.css', jsFile: 42 }])('rejects malformed assets %j', async (assets) => {
    loadFrameworkAdapter.mockResolvedValue({ buildAssets: () => assets });
    await expect(buildAdapterAssets('/theme')).rejects.toThrow('invalid build assets');
  });

  it('preserves build failures', async () => {
    loadFrameworkAdapter.mockResolvedValue({ buildAssets: async () => { throw new Error('Build diagnostic'); } });
    await expect(buildAdapterAssets('/theme')).rejects.toThrow('Build diagnostic');
  });
});
