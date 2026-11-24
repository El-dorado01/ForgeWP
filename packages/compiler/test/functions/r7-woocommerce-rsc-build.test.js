import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureNodeModules = path.join(
  repoRoot,
  'projects',
  'nextjs-adapter-fixture',
  'node_modules',
);

function findFirstHtml(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFirstHtml(full, name);
      if (nested) return nested;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

describe('@forgewp/woocommerce Next.js App Router Server Component compatibility', () => {
  it(
    'builds with next build when a Server Component directly imports WpCheckoutForm, WpShippingSelector, WpCartProvider, and server helpers from @forgewp/woocommerce',
    () => {
      if (!existsSync(path.join(nextFixtureNodeModules, 'next'))) {
        return;
      }

      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-woo-rsc-e2e-'));
      const appDir = path.join(tmp, 'app');

      try {
        mkdirSync(path.join(appDir, 'src', 'app', 'checkout'), { recursive: true });
        mkdirSync(path.join(appDir, 'node_modules', '@forgewp'), { recursive: true });

        const linkType = process.platform === 'win32' ? 'junction' : 'dir';
        for (const entry of readdirSync(nextFixtureNodeModules)) {
          if (entry === '@forgewp' || entry === '.bin') continue;
          symlinkSync(
            path.join(nextFixtureNodeModules, entry),
            path.join(appDir, 'node_modules', entry),
            linkType,
          );
        }
        symlinkSync(
          path.join(repoRoot, 'packages', 'react'),
          path.join(appDir, 'node_modules', '@forgewp', 'react'),
          linkType,
        );
        symlinkSync(
          path.join(repoRoot, 'packages', 'woocommerce'),
          path.join(appDir, 'node_modules', '@forgewp', 'woocommerce'),
          linkType,
        );
        const wooLucide = path.join(
          repoRoot,
          'packages',
          'woocommerce',
          'node_modules',
          'lucide-react',
        );
        if (
          existsSync(wooLucide) &&
          !existsSync(path.join(appDir, 'node_modules', 'lucide-react'))
        ) {
          symlinkSync(
            wooLucide,
            path.join(appDir, 'node_modules', 'lucide-react'),
            linkType,
          );
        }

        writeFileSync(
          path.join(appDir, 'package.json'),
          JSON.stringify(
            {
              name: 'forgewp-woo-rsc-e2e',
              private: true,
              type: 'module',
              scripts: {
                build: 'next build --webpack',
              },
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(appDir, 'tsconfig.json'),
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                lib: ['dom', 'dom.iterable', 'esnext'],
                allowJs: true,
                skipLibCheck: true,
                strict: true,
                noEmit: true,
                esModuleInterop: true,
                module: 'esnext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: 'react-jsx',
                plugins: [{ name: 'next' }],
              },
              include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
              exclude: ['node_modules'],
            },
            null,
            2,
          ),
        );

        writeFileSync(
          path.join(appDir, 'next.config.mjs'),
          `import { withForgeWP } from '@forgewp/react/next';\nexport default withForgeWP({}, { deploymentMode: 'decoupled', transpilePackages: ['@forgewp/woocommerce'] });\n`,
        );

        writeFileSync(
          path.join(appDir, 'src', 'app', 'layout.tsx'),
          `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
        );

        // Server Component (NO 'use client') directly importing both client components and pure server helpers
        writeFileSync(
          path.join(appDir, 'src', 'app', 'checkout', 'page.tsx'),
          `import {\n  WpCartProvider,\n  WpShippingSelector,\n  WpCheckoutForm,\n  WpCheckoutSubmitButton,\n  formatMoney,\n  commerceFetch,\n  submitCheckoutOrder,\n  fetchCheckoutOrder,\n} from '@forgewp/woocommerce';\n\nexport const dynamic = 'force-static';\n\nexport default function CheckoutServerPage() {\n  const formatted = formatMoney(19500);\n  const serverFnsReady =\n    typeof commerceFetch === 'function' &&\n    typeof submitCheckoutOrder === 'function' &&\n    typeof fetchCheckoutOrder === 'function';\n\n  return (\n    <main>\n      <p data-testid="server-price">{formatted}</p>\n      <p data-testid="server-fns">{serverFnsReady ? 'ready' : 'missing'}</p>\n      <WpCartProvider>\n        <WpCheckoutForm>\n          <WpShippingSelector />\n          <WpCheckoutSubmitButton />\n        </WpCheckoutForm>\n      </WpCartProvider>\n    </main>\n  );\n}\n`,
        );

        const nextBin = path.join(
          nextFixtureNodeModules,
          'next',
          'dist',
          'bin',
          'next',
        );
        const build = spawnSync(process.execPath, [nextBin, 'build', '--webpack'], {
          cwd: appDir,
          encoding: 'utf8',
          env: {
            ...process.env,
            NEXT_TELEMETRY_DISABLED: '1',
          },
        });

        expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);

        const checkoutHtmlPath = findFirstHtml(
          path.join(appDir, '.next', 'server', 'app'),
          'checkout.html',
        );
        expect(checkoutHtmlPath).toBeTruthy();
        const checkoutHtml = readFileSync(checkoutHtmlPath, 'utf8');
        expect(checkoutHtml).toContain('$195.00');
        expect(checkoutHtml).toContain('ready');
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
