import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readTemplate = (name) => fs.readFileSync(path.join(__dirname, '..', 'templates', name), 'utf8');

const baseBlueprints = {
  'cms/menus.json': readTemplate('menus.json'),
  'cms/mock-data.json': readTemplate('mock-data.json'),
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

export function getSystemBlueprints(projectRoot = process.cwd()) {
  const hasWooCommerce = checkHasWooCommerce(projectRoot);
  const hasAuth = checkHasAuth(projectRoot);

  const blueprints = { ...baseBlueprints };
  if (hasWooCommerce) {
    blueprints['cms/products.json'] = readTemplate('products.json');
  }
  if (hasAuth) {
    blueprints['cms/users.json'] = readTemplate('users.json');
    blueprints['cms/roles.json'] = readTemplate('roles.json');
    blueprints['cms/sessions.json'] = readTemplate('sessions.json');
  }

  return blueprints;
}

export const SYSTEM_BLUEPRINTS = new Proxy(baseBlueprints, {
  ownKeys() {
    return Reflect.ownKeys(getSystemBlueprints(process.cwd()));
  },
  getOwnPropertyDescriptor(target, prop) {
    const bps = getSystemBlueprints(process.cwd());
    if (prop in bps) {
      return {
        enumerable: true,
        configurable: true,
        writable: true,
        value: bps[prop]
      };
    }
    return undefined;
  },
  get(target, prop) {
    const bps = getSystemBlueprints(process.cwd());
    if (typeof prop === 'string' && prop in bps) {
      return bps[prop];
    }
    return target[prop];
  }
});
