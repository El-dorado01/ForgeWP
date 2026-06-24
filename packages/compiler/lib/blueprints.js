import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readTemplate = (name) => fs.readFileSync(path.join(__dirname, '..', 'templates', name), 'utf8');

const baseBlueprints = {
  'cms/menus.json': readTemplate('menus.json'),
  'cms/mock-data.json': readTemplate('mock-data.json'),
  'src/.forgewp/forgewp-config.ts': readTemplate('forgewp-config.ts'),
  'src/.forgewp/wordpress.tsx': readTemplate('wordpress.tsx'),
  'src/.forgewp/SEO.tsx': readTemplate('SEO.tsx'),
  'src/.forgewp/PresetsStyle.tsx': readTemplate('PresetsStyle.tsx'),
};

function checkHasWooCommerce(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (
        (pkg.dependencies && pkg.dependencies['@forgewp/woocommerce']) ||
        (pkg.devDependencies && pkg.devDependencies['@forgewp/woocommerce']) ||
        (pkg.peerDependencies && pkg.peerDependencies['@forgewp/woocommerce'])
      ) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

function checkHasAuth(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (
        (pkg.dependencies && pkg.dependencies['@forgewp/auth']) ||
        (pkg.devDependencies && pkg.devDependencies['@forgewp/auth']) ||
        (pkg.peerDependencies && pkg.peerDependencies['@forgewp/auth'])
      ) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

export const SYSTEM_BLUEPRINTS = new Proxy(baseBlueprints, {
  ownKeys(target) {
    const keys = Reflect.ownKeys(target);
    const extraKeys = [];
    if (checkHasWooCommerce(process.cwd())) {
      extraKeys.push('cms/products.json');
    }
    if (checkHasAuth(process.cwd())) {
      extraKeys.push('cms/users.json', 'cms/roles.json', 'cms/sessions.json');
    }
    return [...keys, ...extraKeys];
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop === 'cms/products.json') {
      if (checkHasWooCommerce(process.cwd())) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: readTemplate('products.json')
        };
      }
      return undefined;
    }
    if (prop === 'cms/users.json' || prop === 'cms/roles.json' || prop === 'cms/sessions.json') {
      if (checkHasAuth(process.cwd())) {
        const templateName = prop.split('/').pop();
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: readTemplate(templateName)
        };
      }
      return undefined;
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
  get(target, prop) {
    const projectRoot = process.cwd();
    const hasWooCommerce = checkHasWooCommerce(projectRoot);
    const hasAuth = checkHasAuth(projectRoot);

    if (prop === 'cms/products.json') {
      if (hasWooCommerce) {
        return readTemplate('products.json');
      }
      return undefined;
    }

    if (prop === 'cms/users.json' || prop === 'cms/roles.json' || prop === 'cms/sessions.json') {
      if (hasAuth) {
        const templateName = prop.split('/').pop();
        return readTemplate(templateName);
      }
      return undefined;
    }

    if (prop === 'src/.forgewp/wordpress.tsx') {
      let content = target[prop];
      let importsToAdd = "";
      let windowMocksToAdd = "";

      if (hasWooCommerce) {
        importsToAdd += "\n// @ts-ignore\nimport productsData from '../../cms/products.json';";
        content = content.replace(
          "(window as any)._forgeWpMockPosts = mockData;",
          "(window as any)._forgeWpMockPosts = {\n      ...mockData,\n      ...productsData,\n    };"
        );
        content += `\n\n// ── WooCommerce Modular Extensions ───────────────────────────────────────────\nexport * from '@forgewp/woocommerce';\n`;
      }

      if (hasAuth) {
        importsToAdd += "\n// @ts-ignore\nimport usersData from '../../cms/users.json';\n// @ts-ignore\nimport rolesData from '../../cms/roles.json';\n// @ts-ignore\nimport sessionsData from '../../cms/sessions.json';";
        windowMocksToAdd += "\n    (window as any)._forgeWpMockUsers = usersData;\n    (window as any)._forgeWpMockRoles = rolesData;\n    (window as any)._forgeWpMockSessions = sessionsData;";
        content += `\n\n// ── Auth Modular Extensions ───────────────────────────────────────────\nexport * from '@forgewp/auth';\n`;
      }

      if (importsToAdd) {
        content = content.replace(
          "import translationsData from '../../cms/translations.json';",
          "import translationsData from '../../cms/translations.json';" + importsToAdd
        );
      }

      if (windowMocksToAdd) {
        content = content.replace(
          "(window as any)._forgeWpMockMenus = menusData;",
          "(window as any)._forgeWpMockMenus = menusData;" + windowMocksToAdd
        );
      }

      return content;
    }
    return target[prop];
  }
});
