import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption, type UserConfig } from 'vite';
import {
  loadConfig,
  loadFrameworkAdapter,
  validateCriticalFiles,
  forgewpVirtualPlugin,
  forgewpPageConfigPlugin,
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
      // Automatically watch the local database and trigger a reload (skip programmatically written files)
      server.watcher.add(path.resolve(__dirname, 'cms/*.json'));
      server.watcher.on('change', (file) => {
        if (
          file.includes('cms') &&
          file.endsWith('.json') &&
          !file.includes('email-logs.json') &&
          !file.includes('users.json')
        ) {
          server.ws.send({ type: 'full-reload' });
        }
      });

      // Serve custom endpoints for local mock dev logging
      server.middlewares.use((req, res, next) => {
        if (req.url === '/forgewp-dev-api/write-email-log' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const cmsDir = path.resolve(__dirname, 'cms');
              if (!fs.existsSync(cmsDir)) {
                fs.mkdirSync(cmsDir, { recursive: true });
              }
              const logFile = path.resolve(cmsDir, 'email-logs.json');
              let emails = [];
              if (fs.existsSync(logFile)) {
                try {
                  emails = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                } catch (e) {}
              }
              emails.push(data);
              fs.writeFileSync(logFile, JSON.stringify(emails, null, 2), 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
            }
          });
          return;
        }

        if (req.url === '/forgewp-dev-api/write-user' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const newUser = JSON.parse(body);
              const cmsDir = path.resolve(__dirname, 'cms');
              if (!fs.existsSync(cmsDir)) {
                fs.mkdirSync(cmsDir, { recursive: true });
              }
              const usersFile = path.resolve(cmsDir, 'users.json');
              let users = [];
              if (fs.existsSync(usersFile)) {
                try {
                  users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
                } catch (e) {}
              }

              const existingIndex = users.findIndex(
                (u: any) => u.id === newUser.id || u.username === newUser.username
              );
              if (existingIndex !== -1) {
                users[existingIndex] = { ...users[existingIndex], ...newUser };
              } else {
                users.push(newUser);
              }

              fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, users }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(async (): Promise<UserConfig> => {
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
      'import.meta.env.FORGEWP_AUTH_LOGIN_FIELD': JSON.stringify(config.auth?.loginField || 'usernameAndEmail'),
      'import.meta.env.FORGEWP_AUTH_EMAIL_VERIFICATION': JSON.stringify(config.auth?.features?.emailVerification || false),
    },
    plugins: [
      forgewpPageConfigPlugin(),
      react(),
      tailwindcss(),
      forgewpVirtualPlugin({ projectRoot: __dirname }),
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
      watch: {
        ignored: ['**/cms/email-logs.json', '**/cms/users.json', '**/cms/sessions.json'],
      },
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
