import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing ${path.basename(filePath)} in scaffold.\n` +
        'The CLI template may be out of date — run pnpm sync:template in the ForgeWP repo.',
    );
  }

  let content = readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  writeFileSync(filePath, content, 'utf8');
}

export function applyProjectConfig(targetDir, config) {
  const { packageName, themeName, slug, description, textDomain, version } =
    config;

  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = readJson(pkgPath);
  pkg.name = packageName;
  pkg.private = true;
  pkg.version = version;

  const features = config.features || [];
  const hasEcommerce = features.includes('ecommerce');
  const hasAuth = features.includes('auth');

  if (!hasEcommerce) {
    if (pkg.dependencies && pkg.dependencies['@forgewp/woocommerce']) {
      delete pkg.dependencies['@forgewp/woocommerce'];
    }
  }

  // If we are inside the ForgeWP monorepo, use workspace:* for the compiler and react dependencies
  // to ensure pnpm links them locally instead of trying to fetch from the registry.
  const isWorkspace = existsSync(path.join(targetDir, '..', 'pnpm-workspace.yaml'));
  if (isWorkspace) {
    if (pkg.devDependencies?.['@forgewp/compiler']) {
      pkg.devDependencies['@forgewp/compiler'] = 'workspace:*';
    }
    if (pkg.dependencies?.['@forgewp/react']) {
      pkg.dependencies['@forgewp/react'] = 'workspace:*';
    }
  }

  if (hasAuth) {
    if (!pkg.dependencies) pkg.dependencies = {};
    pkg.dependencies['@forgewp/auth'] = isWorkspace ? 'workspace:*' : '^0.1.0';
  }

  writeJson(pkgPath, pkg);

  const wpConfigPath = path.join(targetDir, 'wp.config.ts');
  if (existsSync(wpConfigPath)) {
    let content = readFileSync(wpConfigPath, 'utf8');

    // Dynamically replace the metadata fields to preserve all other layout and color settings
    content = content.replace(/name:\s*'[^']*'/, `name: ${JSON.stringify(themeName)}`);
    content = content.replace(/slug:\s*'[^']*'/, `slug: ${JSON.stringify(slug)}`);
    content = content.replace(/version:\s*'[^']*'/, `version: ${JSON.stringify(version)}`);
    content = content.replace(/description:\s*'[^']*'/, `description: ${JSON.stringify(description)}`);
    content = content.replace(/textDomain:\s*'[^']*'/, `textDomain: ${JSON.stringify(textDomain)}`);
    content = content.replace(/style:\s*'[^']*'/, `style: ${JSON.stringify(config.style || 'shadcn')}`);

    // Ensure frameworkAdapter is set
    if (!content.includes('frameworkAdapter:')) {
      if (content.includes('defineConfig(')) {
        content = content.replace(
          /(defineConfig\(\{)/,
          `$1\n  frameworkAdapter: ${JSON.stringify(config.adapter || 'react')},`
        );
      } else {
        content = content.replace(
          /(const config:\s*ForgeWPThemeConfig\s*=\s*\{)/,
          `$1\n  frameworkAdapter: ${JSON.stringify(config.adapter || 'react')},`
        );
      }
    } else {
      content = content.replace(
        /frameworkAdapter:\s*'[^']*'/,
        `frameworkAdapter: ${JSON.stringify(config.adapter || 'react')}`
      );
    }

    if (hasAuth && !content.includes('auth:')) {
      const authConfigBlock = `  auth: {
    loginField: 'usernameAndEmail',
    defaultRole: 'subscriber',
    reservedUsernames: ['admin', 'system', 'root', 'administrator'],
    features: {
      registration: true,
      emailVerification: true,
      autoLoginAfterSignup: false,
    },
    emails: {
      verification: {
        subject: 'Verify your ForgeWP Account',
        body: 'Welcome to ForgeWP! Click this link to verify your email address:\\\\n\\\\n{verification_url}',
      },
      passwordReset: {
        subject: 'Password Reset Request',
        body: 'Click the link below to reset your password:\\\\n\\\\n{reset_url}',
      },
    },
  },`;

      if (content.includes('defineConfig(')) {
        content = content.replace(
          /(defineConfig\(\{)/,
          `$1\n${authConfigBlock}`
        );
      } else {
        content = content.replace(
          /(const config:\s*ForgeWPThemeConfig\s*=\s*\{)/,
          `$1\n${authConfigBlock}`
        );
      }
    }

    writeFileSync(wpConfigPath, content, 'utf8');
  }

  replaceInFile(path.join(targetDir, 'index.html'), [
    ['ForgeWP Starter', themeName],
    ['ForgeWP HTML Starter', themeName],
  ]);

  const tsConfigPath = path.join(targetDir, 'tsconfig.json');
  if (existsSync(tsConfigPath)) {
    const tsconfig = readJson(tsConfigPath);
    if (tsconfig.compilerOptions?.paths) {
      if (isWorkspace) {
        tsconfig.compilerOptions.paths['@forgewp/react'] = ['../../react/src/index.ts'];
        tsconfig.compilerOptions.paths['@forgewp/compiler'] = ['../../compiler/lib/index.d.ts'];
        tsconfig.compilerOptions.paths['@forgewp/compiler/*'] = ['../../compiler/*'];
        if (hasAuth) {
          tsconfig.compilerOptions.paths['@forgewp/auth'] = ['../../auth/src/index.ts'];
        } else {
          delete tsconfig.compilerOptions.paths['@forgewp/auth'];
        }
        if (hasEcommerce) {
          tsconfig.compilerOptions.paths['@forgewp/woocommerce'] = ['../../woocommerce/src/index.ts'];
        } else {
          delete tsconfig.compilerOptions.paths['@forgewp/woocommerce'];
        }
      } else {
        delete tsconfig.compilerOptions.paths['@forgewp/react'];
        delete tsconfig.compilerOptions.paths['@forgewp/compiler'];
        delete tsconfig.compilerOptions.paths['@forgewp/compiler/*'];
        delete tsconfig.compilerOptions.paths['@forgewp/auth'];
        delete tsconfig.compilerOptions.paths['@forgewp/woocommerce'];
      }
      writeJson(tsConfigPath, tsconfig);
    }
  }

  // Configure cms folder and sandbox file pre-seeding
  const cmsDir = path.join(targetDir, 'cms');
  if (hasEcommerce || hasAuth) {
    if (!existsSync(cmsDir)) {
      mkdirSync(cmsDir, { recursive: true });
    }
  }

  // Handle products.json
  const productsPath = path.join(cmsDir, 'products.json');
  if (hasEcommerce) {
    const defaultProducts = {
      "product": [],
      "_taxonomy_product_cat": [],
      "_taxonomy_product_tag": []
    };
    writeJson(productsPath, defaultProducts);
  } else {
    if (existsSync(productsPath)) {
      rmSync(productsPath, { force: true });
    }
  }

  // Handle Auth files
  const usersPath = path.join(cmsDir, 'users.json');
  const rolesPath = path.join(cmsDir, 'roles.json');
  const sessionsPath = path.join(cmsDir, 'sessions.json');

  if (hasAuth) {
    const defaultUsers = [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@forgewp.local",
        "displayName": "Concrete Designer",
        "roles": ["administrator"],
        "avatarUrl": "https://picsum.photos/seed/avatar1/150/150",
        "emailVerified": true
      },
      {
        "id": 2,
        "username": "subscriber",
        "email": "user@forgewp.local",
        "displayName": "Sub Concrete",
        "roles": ["subscriber"],
        "avatarUrl": "https://picsum.photos/seed/avatar2/150/150",
        "emailVerified": true
      },
      {
        "id": 3,
        "username": "editor",
        "email": "editor@forgewp.local",
        "displayName": "Concrete Editor",
        "roles": ["editor"],
        "avatarUrl": "https://picsum.photos/seed/avatar3/150/150",
        "emailVerified": true
      },
      {
        "id": 4,
        "username": "customer",
        "email": "customer@forgewp.local",
        "displayName": "Concrete Customer",
        "roles": ["customer"],
        "avatarUrl": "https://picsum.photos/seed/avatar4/150/150",
        "emailVerified": true
      }
    ];
    const defaultRoles = {
      "administrator": ["manage_options", "edit_theme_options", "edit_posts", "edit_others_posts", "publish_posts", "read"],
      "editor": ["edit_posts", "edit_others_posts", "publish_posts", "read"],
      "author": ["edit_posts", "publish_posts", "read"],
      "subscriber": ["read"],
      "customer": ["read"]
    };
    const defaultSessions = [];

    writeJson(usersPath, defaultUsers);
    writeJson(rolesPath, defaultRoles);
    writeJson(sessionsPath, defaultSessions);
  } else {
    if (existsSync(usersPath)) rmSync(usersPath, { force: true });
    if (existsSync(rolesPath)) rmSync(rolesPath, { force: true });
    if (existsSync(sessionsPath)) rmSync(sessionsPath, { force: true });
  }

  // Handle wordpress.tsx imports/exports depending on features
  const wpHooksPath = path.join(targetDir, 'src', '.forgewp', 'wordpress.tsx');
  if (existsSync(wpHooksPath)) {
    let content = readFileSync(wpHooksPath, 'utf8');

    // 1. Handle WooCommerce
    if (!hasEcommerce) {
      // Remove any WooCommerce exports
      content = content.replace(/\/\/ ── WooCommerce Modular Extensions ───────────────────────────────────────────\r?\nexport \* from '@forgewp\/woocommerce';\r?\n?/g, '');
      content = content.replace(/export \* from '@forgewp\/woocommerce';\r?\n?/g, '');
      // Remove productsData import if any
      content = content.replace(/\/\/ @ts-ignore\r?\nimport productsData from '\.\.\/\.\.\/cms\/products\.json';\r?\n?/g, '');
      // Restore _forgeWpMockPosts mapping if it was modified
      content = content.replace(
        /\(window as any\)\._forgeWpMockPosts = \{\r?\n\s*\.\.\.mockData,\r?\n\s*\.\.\.productsData,\r?\n\s*\};/g,
        '(window as any)._forgeWpMockPosts = mockData;'
      );
    } else {
      // Ensure WooCommerce exports and imports are present if they aren't already
      if (!content.includes("import productsData from '../../cms/products.json'")) {
        content = content.replace(
          "import translationsData from '../../cms/translations.json';",
          "import translationsData from '../../cms/translations.json';\n// @ts-ignore\nimport productsData from '../../cms/products.json';"
        );
      }
      if (!content.includes("...productsData")) {
        content = content.replace(
          "(window as any)._forgeWpMockPosts = mockData;",
          `(window as any)._forgeWpMockPosts = {
      ...mockData,
      ...productsData,
    };`
        );
      }
      if (!content.includes("@forgewp/woocommerce")) {
        content += `\n\n// ── WooCommerce Modular Extensions ───────────────────────────────────────────\nexport * from '@forgewp/woocommerce';\n`;
      }
    }

    // 2. Handle Auth
    if (hasAuth) {
      // Add imports
      if (!content.includes("import usersData from '../../cms/users.json'")) {
        content = content.replace(
          "import translationsData from '../../cms/translations.json';",
          "import translationsData from '../../cms/translations.json';\n// @ts-ignore\nimport usersData from '../../cms/users.json';\n// @ts-ignore\nimport rolesData from '../../cms/roles.json';\n// @ts-ignore\nimport sessionsData from '../../cms/sessions.json';"
        );
      }
      // Add window mocks
      if (!content.includes("_forgeWpMockUsers")) {
        content = content.replace(
          "(window as any)._forgeWpMockMenus = menusData;",
          `(window as any)._forgeWpMockMenus = menusData;
    (window as any)._forgeWpMockUsers = usersData;
    (window as any)._forgeWpMockRoles = rolesData;
    (window as any)._forgeWpMockSessions = sessionsData;`
        );
      }
      // Add exports
      if (!content.includes("@forgewp/auth")) {
        content += `\n\n// ── Auth Modular Extensions ───────────────────────────────────────────\nexport * from '@forgewp/auth';\n`;
      }
    } else {
      // Remove any Auth exports
      content = content.replace(/\/\/ ── Auth Modular Extensions ───────────────────────────────────────────\r?\nexport \* from '@forgewp\/auth';\r?\n?/g, '');
      content = content.replace(/export \* from '@forgewp\/auth';\r?\n?/g, '');
      // Remove imports
      content = content.replace(/\/\/ @ts-ignore\r?\nimport usersData from '\.\.\/\.\.\/cms\/users\.json';\r?\n?/g, '');
      content = content.replace(/\/\/ @ts-ignore\r?\nimport rolesData from '\.\.\/\.\.\/cms\/roles\.json';\r?\n?/g, '');
      content = content.replace(/\/\/ @ts-ignore\r?\nimport sessionsData from '\.\.\/\.\.\/cms\/sessions\.json';\r?\n?/g, '');
      // Remove window mocks
      content = content.replace(
        /\(window as any\)\._forgeWpMockMenus = menusData;\r?\n\s*\(window as any\)\._forgeWpMockUsers = usersData;\r?\n\s*\(window as any\)\._forgeWpMockRoles = rolesData;\r?\n\s*\(window as any\)\._forgeWpMockSessions = sessionsData;/g,
        '(window as any)._forgeWpMockMenus = menusData;'
      );
    }

    writeFileSync(wpHooksPath, content, 'utf8');
  }

  // Handle copying of pages and components from resources/auth if auth feature is active
  if (hasAuth) {
    const resourcesAuthDir = path.join(targetDir, 'resources', 'auth');
    if (existsSync(resourcesAuthDir)) {
      const copyIfNotExist = (src, dest) => {
        if (existsSync(dest)) return;
        const dir = path.dirname(dest);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(dest, readFileSync(src, 'utf8'), 'utf8');
      };

      // 1. Copy Components
      const componentsSrcDir = path.join(resourcesAuthDir, 'components');
      const componentsDestDir = path.join(targetDir, 'src', 'components');
      if (existsSync(componentsSrcDir)) {
        copyIfNotExist(path.join(componentsSrcDir, 'login-form.tsx'), path.join(componentsDestDir, 'login-form.tsx'));
        copyIfNotExist(path.join(componentsSrcDir, 'signup-form.tsx'), path.join(componentsDestDir, 'signup-form.tsx'));
      }

      // 2. Copy Pages
      const pagesSrcDir = path.join(resourcesAuthDir, 'pages');
      const pagesDestDir = path.join(targetDir, 'src', 'app', 'pages');
      if (existsSync(pagesSrcDir)) {
        const pages = ['LoginPage.tsx', 'SignUpPage.tsx', 'VerifyEmailPage.tsx', 'ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx'];
        for (const page of pages) {
          copyIfNotExist(path.join(pagesSrcDir, page), path.join(pagesDestDir, page));
        }
      }

      // 3. Update src/app/routes.tsx to register auth routes
      const routesPath = path.join(targetDir, 'src', 'app', 'routes.tsx');
      if (existsSync(routesPath)) {
        let routesContent = readFileSync(routesPath, 'utf8');
        if (!routesContent.includes('/forgot-password')) {
          const importBlock = `import LoginPage from "./pages/LoginPage";\nimport SignUpPage from "./pages/SignUpPage";\nimport VerifyEmailPage from "./pages/VerifyEmailPage";\nimport ForgotPasswordPage from "./pages/ForgotPasswordPage";\nimport ResetPasswordPage from "./pages/ResetPasswordPage";\n`;
          routesContent = importBlock + routesContent;

          const routesBlock = `      <Route path="/login" component={LoginPage} />\n      <Route path="/signup" component={SignUpPage} />\n      <Route path="/verify-email" component={VerifyEmailPage} />\n      <Route path="/forgot-password" component={ForgotPasswordPage} />\n      <Route path="/reset-password" component={ResetPasswordPage} />\n`;
          if (routesContent.includes('<Route path="/query-sandbox"')) {
            routesContent = routesContent.replace('<Route path="/query-sandbox"', routesBlock + '      <Route path="/query-sandbox"');
          } else if (routesContent.includes('<Route path="/" component={HomePage} />')) {
            routesContent = routesContent.replace('<Route path="/" component={HomePage} />', '<Route path="/" component={HomePage} />\n' + routesBlock);
          } else {
            routesContent = routesContent.replace(/<Switch>/i, `<Switch>\n${routesBlock}`);
          }
          writeFileSync(routesPath, routesContent, 'utf8');
        }
      }
    }
  }

  // 5. Clean up temporary resources directory if it exists
  const resourcesDir = path.join(targetDir, 'resources');
  if (existsSync(resourcesDir)) {
    try {
      rmSync(resourcesDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[scaffold] Failed to clean up resources folder:', e.message);
    }
  }
}
