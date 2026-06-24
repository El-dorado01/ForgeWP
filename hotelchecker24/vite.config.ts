import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';
import {
  loadConfig,
  loadFrameworkAdapter,
  validateCriticalFiles,
} from '@forgewp/compiler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Custom Vite Plugin to validate and self-heal theme files on dev startup. */
function forgewpValidationPlugin(): PluginOption {
  return {
    name: 'forgewp-validation',
    buildStart() {
      try {
        validateCriticalFiles(__dirname);
      } catch (err) {
        console.error(
          `\n\x1b[31m[ForgeWP Validation Error]\x1b[0m\n${
            err instanceof Error ? err.message : String(err)
          }\n`,
        );
      }
    },
    configureServer(server) {
      // Automatically watch the local database and trigger a reload
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
  const adapterName = config.frameworkAdapter || 'react';
  const adapter = await loadFrameworkAdapter(adapterName);
  const getHydrationRollupInputs =
    adapter.getHydrationRollupInputs ||
    adapter.default?.getHydrationRollupInputs;

  return {
    envPrefix: ['VITE_', 'FORGEWP_'],
    define: {
      'import.meta.env.FORGEWP_API_URL': JSON.stringify(config.headless?.apiUrl || ''),
      'import.meta.env.FORGEWP_JWT_AUTH': JSON.stringify(config.headless?.jwtAuth || false),
    },
    plugins: [
      react(),
      tailwindcss(),
      forgewpValidationPlugin(),
    ] as PluginOption[],
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
  };
});
