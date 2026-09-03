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

  // Handle products.ts
  const productsTsPath = path.join(cmsDir, 'products.ts');
  const productsJsonPath = path.join(cmsDir, 'products.json');
  if (hasEcommerce) {
    const defaultProductsTs = `import { defineProducts } from '@forgewp/woocommerce';\n\nexport const products = defineProducts([]);\n\nexport const _taxonomy_product_cat = [];\nexport const _taxonomy_product_tag = [];\n\nexport default products;\n`;
    writeFileSync(productsTsPath, defaultProductsTs, 'utf8');
    if (existsSync(productsJsonPath)) rmSync(productsJsonPath, { force: true });
  } else {
    if (existsSync(productsTsPath)) rmSync(productsTsPath, { force: true });
    if (existsSync(productsJsonPath)) rmSync(productsJsonPath, { force: true });
  }

  // Handle Auth files
  const usersTsPath = path.join(cmsDir, 'users.ts');
  const usersJsonPath = path.join(cmsDir, 'users.json');
  const rolesTsPath = path.join(cmsDir, 'roles.ts');
  const rolesJsonPath = path.join(cmsDir, 'roles.json');
  const sessionsPath = path.join(cmsDir, 'sessions.json');

  if (hasAuth) {
    const defaultUsersTs = `import { defineWpUsers } from '@forgewp/react';\n\nexport const users = defineWpUsers([\n  {\n    id: 1,\n    username: "admin",\n    email: "admin@forgewp.local",\n    displayName: "Concrete Designer",\n    roles: ["administrator"],\n    avatarUrl: "https://picsum.photos/seed/avatar1/150/150",\n    emailVerified: true\n  },\n  {\n    id: 2,\n    username: "subscriber",\n    email: "user@forgewp.local",\n    displayName: "Sub Concrete",\n    roles: ["subscriber"],\n    avatarUrl: "https://picsum.photos/seed/avatar2/150/150",\n    emailVerified: true\n  },\n  {\n    id: 3,\n    username: "editor",\n    email: "editor@forgewp.local",\n    displayName: "Concrete Editor",\n    roles: ["editor"],\n    avatarUrl: "https://picsum.photos/seed/avatar3/150/150",\n    emailVerified: true\n  },\n  {\n    id: 4,\n    username: "customer",\n    email: "customer@forgewp.local",\n    displayName: "Concrete Customer",\n    roles: ["customer"],\n    avatarUrl: "https://picsum.photos/seed/avatar4/150/150",\n    emailVerified: true\n  }\n]);\n\nexport default users;\n`;
    const defaultRolesTs = `import { defineWpRoles } from '@forgewp/react';\n\nexport const roles = defineWpRoles({\n  administrator: ["manage_options", "edit_theme_options", "edit_posts", "edit_others_posts", "publish_posts", "read"],\n  editor: ["edit_posts", "edit_others_posts", "publish_posts", "read"],\n  author: ["edit_posts", "publish_posts", "read"],\n  subscriber: ["read"],\n  customer: ["read"]\n});\n\nexport default roles;\n`;
    const defaultSessions = [];

    writeFileSync(usersTsPath, defaultUsersTs, 'utf8');
    writeFileSync(rolesTsPath, defaultRolesTs, 'utf8');
    writeJson(sessionsPath, defaultSessions);
    if (existsSync(usersJsonPath)) rmSync(usersJsonPath, { force: true });
    if (existsSync(rolesJsonPath)) rmSync(rolesJsonPath, { force: true });
  } else {
    if (existsSync(usersTsPath)) rmSync(usersTsPath, { force: true });
    if (existsSync(usersJsonPath)) rmSync(usersJsonPath, { force: true });
    if (existsSync(rolesTsPath)) rmSync(rolesTsPath, { force: true });
    if (existsSync(rolesJsonPath)) rmSync(rolesJsonPath, { force: true });
    if (existsSync(sessionsPath)) rmSync(sessionsPath, { force: true });
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
          const importBlock = `import * as LoginPage from "./pages/LoginPage";\nimport * as SignUpPage from "./pages/SignUpPage";\nimport * as VerifyEmailPage from "./pages/VerifyEmailPage";\nimport * as ForgotPasswordPage from "./pages/ForgotPasswordPage";\nimport * as ResetPasswordPage from "./pages/ResetPasswordPage";\n`;
          routesContent = importBlock + routesContent;

          const routesBlock = `      <Route path="/login" component={withLayout(LoginPage)} />\n      <Route path="/signup" component={withLayout(SignUpPage)} />\n      <Route path="/verify-email" component={withLayout(VerifyEmailPage)} />\n      <Route path="/forgot-password" component={withLayout(ForgotPasswordPage)} />\n      <Route path="/reset-password" component={withLayout(ResetPasswordPage)} />\n`;
          if (routesContent.includes('<Route path="/query-sandbox"')) {
            routesContent = routesContent.replace('<Route path="/query-sandbox"', routesBlock + '      <Route path="/query-sandbox"');
          } else if (routesContent.includes('<Route path="/" component={withLayout(HomePage)} />') || routesContent.includes('<Route path="/" component={HomePage} />')) {
            routesContent = routesContent.replace(/<Route path="\/" component=\{.*?\} \/>/, (match) => `${match}\n${routesBlock}`);
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
