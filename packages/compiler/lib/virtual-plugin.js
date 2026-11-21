import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './load-config.js';
import { buildFormsPreviewData, formsPreviewScript } from './forms-preview.js';

/**
 * ForgeWP Vite Virtual Plugin
 *
 * Provides zero-clutter virtual runtime module resolution and dynamic dev-mode
 * mock data injection directly from local `cms/*.ts` files into the browser runtime.
 *
 * @param {Object} options
 * @param {string} [options.projectRoot]
 * @returns {import('vite').Plugin}
 */
export function forgewpVirtualPlugin(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  const VIRTUAL_RUNTIME_ID = 'virtual:forgewp-runtime';
  const RESOLVED_RUNTIME_ID = '\0' + VIRTUAL_RUNTIME_ID;
  let development = false;
  let formPreview = buildFormsPreviewData({});
  let authPreview = {};
  async function refreshForms() {
    const configPath = path.join(projectRoot, 'wp.config.ts');
    const config = fs.existsSync(configPath) ? await loadConfig(projectRoot) : {};
    formPreview = buildFormsPreviewData(config);
    const auth = config.auth || {};
    authPreview = { registration: auth.features?.registration, emailVerification: auth.features?.emailVerification, autoLoginAfterSignup: auth.features?.autoLoginAfterSignup, defaultRole: auth.defaultRole, loginField: auth.loginField, registrationMetaFields: auth.registrationMetaFields || [], reservedUsernames: (auth.reservedUsernames || ['admin', 'system', 'root']).map((name) => name.toLowerCase()) };
  }
  const isFormSource = (file) => {
    const relative = path.relative(projectRoot, file).replaceAll('\\', '/');
    return relative === 'wp.config.ts' || (relative.startsWith('cms/mail/') && relative.endsWith('.json')) || (relative.startsWith('cms/forms/') && /\.[jt]sx?$/.test(relative));
  };
  function reloadForms(server) {
    const module = server.moduleGraph.getModuleById(RESOLVED_RUNTIME_ID);
    if (module) server.moduleGraph.invalidateModule(module);
    server.ws.send({ type: 'full-reload' });
  }

  function hasPackage(pkgName) {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return Boolean(
          (pkg.dependencies && pkg.dependencies[pkgName]) ||
          (pkg.devDependencies && pkg.devDependencies[pkgName]) ||
          (pkg.peerDependencies && pkg.peerDependencies[pkgName]),
        );
      } catch (e) {}
    }
    return false;
  }

  return {
    name: 'forgewp-virtual-runtime',
    configResolved(config) { development = config.command === 'serve'; },
    async buildStart() {
      if (!development) return;
      await refreshForms();
      this.addWatchFile?.(path.join(projectRoot, 'wp.config.ts'));
    },
    configureServer(server) {
      const formsDir = path.join(projectRoot, 'cms/forms');
      server.watcher.add(formsDir);
      server.watcher.add(path.join(projectRoot, 'cms/mail'));
      const onStructureChange = async (file) => {
        if (!isFormSource(file)) return;
        try { await refreshForms(); reloadForms(server); }
        catch (error) { server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack } }); }
      };
      server.watcher.on('add', onStructureChange);
      server.watcher.on('unlink', onStructureChange);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', onStructureChange);
        server.watcher.off('unlink', onStructureChange);
      });
    },
    async handleHotUpdate({ file, server }) {
      if (!isFormSource(file)) return;
      await refreshForms();
      reloadForms(server);
      return [];
    },

    resolveId(id) {
      if (id === VIRTUAL_RUNTIME_ID) {
        return RESOLVED_RUNTIME_ID;
      }
      return null;
    },

    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (
        (cleanId.endsWith('/src/main.tsx') ||
          cleanId.endsWith('/src/main.jsx') ||
          cleanId.endsWith('/src/main.ts') ||
          cleanId.endsWith('/src/main.js') ||
          cleanId.endsWith('/src/index.tsx') ||
          cleanId.endsWith('/src/index.jsx')) &&
        !code.includes('virtual:forgewp-runtime')
      ) {
        return {
          code: `import 'virtual:forgewp-runtime';\n` + code,
          map: null,
        };
      }
      return null;
    },

    load(id) {
      if (id === RESOLVED_RUNTIME_ID) {
        const cmsDir = path.join(projectRoot, 'cms');
        const hasWooCommerce = hasPackage('@forgewp/woocommerce');
        const hasAuth = hasPackage('@forgewp/auth');

        const imports = [];
        const unwrapLogic = [
          `const _u = (m, ...ks) => { const o = Object(m); for (const k of ks) if (o[k] !== undefined) return o[k]; return m; };`,
        ];

        const findCmsModule = (baseName, exts = ['.ts', '.mjs', '.js']) => {
          for (const ext of exts) {
            const full = path.join(cmsDir, `${baseName}${ext}`);
            if (fs.existsSync(full)) return `/cms/${baseName}${ext}`;
          }
          return null;
        };

        // 1. Mock Data / Posts
        const mockDataMod = findCmsModule('mock-data');
        const mockDataJson = path.join(cmsDir, 'mock-data.json');
        if (mockDataMod) {
          imports.push(`import * as rawMockData from '${mockDataMod}';`);
          unwrapLogic.push(
            `const mockData = _u(rawMockData, 'default', 'mockData') || {};`,
          );
        } else if (fs.existsSync(mockDataJson)) {
          imports.push(`import rawMockData from '/cms/mock-data.json';`);
          unwrapLogic.push(
            `const mockData = _u(rawMockData, 'default', 'mockData') || {};`,
          );
        } else {
          unwrapLogic.push(`const mockData = {};`);
        }

        // 2. Menus
        const menusMod = findCmsModule('menus');
        const menusJson = path.join(cmsDir, 'menus.json');
        if (menusMod) {
          imports.push(`import * as rawMenusData from '${menusMod}';`);
          unwrapLogic.push(
            `const menusData = _u(rawMenusData, 'default', 'menus') || {};`,
          );
        } else if (fs.existsSync(menusJson)) {
          imports.push(`import rawMenusData from '/cms/menus.json';`);
          unwrapLogic.push(
            `const menusData = _u(rawMenusData, 'default', 'menus') || {};`,
          );
        } else {
          unwrapLogic.push(`const menusData = {};`);
        }

        // 3. Translations
        const transMod = findCmsModule('translations');
        const transJson = path.join(cmsDir, 'translations.json');
        if (transMod) {
          imports.push(`import * as rawTranslationsData from '${transMod}';`);
          unwrapLogic.push(
            `const translationsData = _u(rawTranslationsData, 'default', 'translations') || {};`,
          );
        } else if (fs.existsSync(transJson)) {
          imports.push(`import rawTranslationsData from '/cms/translations.json';`);
          unwrapLogic.push(
            `const translationsData = _u(rawTranslationsData, 'default', 'translations') || {};`,
          );
        } else {
          unwrapLogic.push(`const translationsData = {};`);
        }

        // 4. Products (WooCommerce)
        if (hasWooCommerce) {
          const prodTs = path.join(cmsDir, 'products.ts');
          const prodJson = path.join(cmsDir, 'products.json');
          if (fs.existsSync(prodTs) || fs.existsSync(prodJson)) {
            const isTs = fs.existsSync(prodTs);
            const importPath = isTs ? '/cms/products.ts' : '/cms/products.json';
            imports.push(
              isTs
                ? `import * as rawProductsData from '${importPath}';`
                : `import rawProductsData from '${importPath}';`,
            );
            unwrapLogic.push(
              `const normalizedProducts = _u(rawProductsData, 'default', 'products', 'product') || [];`,
            );
            unwrapLogic.push(
              `const productsMap = Array.isArray(normalizedProducts) ? { product: normalizedProducts } : normalizedProducts;`,
            );
          } else {
            unwrapLogic.push(`const productsMap = {};`);
          }
        } else {
          unwrapLogic.push(`const productsMap = {};`);
        }

        // 5. Auth (Users, Roles, Sessions)
        if (hasAuth) {
          const usersTs = path.join(cmsDir, 'users.ts');
          const usersJson = path.join(cmsDir, 'users.json');
          if (fs.existsSync(usersTs) || fs.existsSync(usersJson)) {
            const isTs = fs.existsSync(usersTs);
            const importPath = isTs ? '/cms/users.ts' : '/cms/users.json';
            imports.push(
              isTs
                ? `import * as rawUsersData from '${importPath}';`
                : `import rawUsersData from '${importPath}';`,
            );
            unwrapLogic.push(
              `const usersData = _u(rawUsersData, 'default', 'users');`,
            );
          } else {
            unwrapLogic.push(`const usersData = [];`);
          }

          const rolesTs = path.join(cmsDir, 'roles.ts');
          const rolesJson = path.join(cmsDir, 'roles.json');
          if (fs.existsSync(rolesTs) || fs.existsSync(rolesJson)) {
            const isTs = fs.existsSync(rolesTs);
            const importPath = isTs ? '/cms/roles.ts' : '/cms/roles.json';
            imports.push(
              isTs
                ? `import * as rawRolesData from '${importPath}';`
                : `import rawRolesData from '${importPath}';`,
            );
            unwrapLogic.push(
              `const rolesData = _u(rawRolesData, 'default', 'roles');`,
            );
          } else {
            unwrapLogic.push(`const rolesData = {};`);
          }

          const sessionsJson = path.join(cmsDir, 'sessions.json');
          if (fs.existsSync(sessionsJson)) {
            imports.push(`import rawSessionsData from '/cms/sessions.json';`);
            unwrapLogic.push(`const sessionsData = rawSessionsData || [];`);
          } else {
            unwrapLogic.push(`const sessionsData = [];`);
          }
        }

        // 6. Site options & Theme mods
        const siteOptionsMod = findCmsModule('site-options');
        const siteSettingsJson = path.join(cmsDir, 'site-settings.json');
        if (siteOptionsMod) {
          imports.push(
            `import * as rawOptionsData from '${siteOptionsMod}';`,
          );
          unwrapLogic.push(
            `const optionsData = _u(rawOptionsData, 'default', 'siteOptions', 'options') || {};`,
          );
        } else if (fs.existsSync(siteSettingsJson)) {
          imports.push(
            `import rawSiteSettings from '/cms/site-settings.json';`,
          );
          unwrapLogic.push(
            `const optionsData = (rawSiteSettings && rawSiteSettings.options) || {};`,
          );
        } else {
          unwrapLogic.push(`const optionsData = {};`);
        }

        const themeModsMod = findCmsModule('theme-mods');
        if (themeModsMod) {
          imports.push(`import * as rawModsData from '${themeModsMod}';`);
          unwrapLogic.push(
            `const modsData = _u(rawModsData, 'default', 'themeMods') || {};`,
          );
        } else if (fs.existsSync(siteSettingsJson)) {
          unwrapLogic.push(
            `const modsData = (typeof rawSiteSettings !== 'undefined' && rawSiteSettings.theme_mods) || {};`,
          );
        } else {
          unwrapLogic.push(`const modsData = {};`);
        }

        return `
${imports.join('\n')}

${unwrapLogic.join('\n')}

if (typeof window !== 'undefined') {
  window._forgeWpMockSiteSettings = {
    options: optionsData,
    theme_mods: modsData,
  };
  window._forgeWpMockPosts = {
    ...mockData,
    ...productsMap,
  };
  window._forgeWpMockMenus = menusData;
  window._forgeWpMockTranslations = translationsData;
  ${development ? formsPreviewScript(formPreview) : ''}
  ${development ? `window._forgeWpAuthPreview = ${JSON.stringify(authPreview)};` : ''}
  ${hasAuth ? `window._forgeWpMockUsers = usersData;\n  window._forgeWpMockRoles = rolesData;\n  window._forgeWpMockSessions = sessionsData;` : ''}
}

export default {
  mockData,
  menusData,
  translationsData,
};
`;
      }

      return null;
    },
  };
}

export default forgewpVirtualPlugin;
