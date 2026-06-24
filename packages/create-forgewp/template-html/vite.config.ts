import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption } from 'vite';
import {
  loadConfig,
  loadFrameworkAdapter,
  validateCriticalFiles,
} from '@forgewp/compiler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function forgewpValidationPlugin(): PluginOption {
  return {
    name: 'forgewp-validation',
    configureServer(server) {
      try {
        validateCriticalFiles(__dirname);
      } catch (err) {
        console.error(
          `\n\x1b[31m[ForgeWP Validation Error]\x1b[0m\n${
            err instanceof Error ? err.message : String(err)
          }\n`,
        );
      }

      server.watcher.add(path.resolve(__dirname, 'cms/*.json'));
      server.watcher.on('change', (file) => {
        if (file.includes('cms') && file.endsWith('.json')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig(async () => {
  const config = await loadConfig(__dirname);
  const adapterName = config.frameworkAdapter || 'html';
  const adapter = await loadFrameworkAdapter(adapterName);
  const getHydrationRollupInputs =
    adapter.getHydrationRollupInputs ||
    adapter.default?.getHydrationRollupInputs;

  return {
    plugins: [tailwindcss(), forgewpValidationPlugin()] as PluginOption[],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: getHydrationRollupInputs(__dirname),
      },
    },
    experimental: {
      renderBuiltUrl(filename: string, { hostType }: { hostType: 'js' | 'css' | 'html' }) {
        if (hostType === 'js') {
          return {
            runtime: `(window.forgeWpHydration?.themeUri || '') + '/' + ${JSON.stringify(filename)}`
          };
        }
        return { relative: true };
      }
    }
  };
});
