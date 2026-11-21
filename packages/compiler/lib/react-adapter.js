import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { createUi } from './terminal-ui.js';
import { fileURLToPath } from 'node:url';
import { spawnAsync } from './spawn-async.js';
import { createRequire } from 'node:module';
import pc from 'picocolors';
import { loadMockData } from './functions/seed-mock-data.js';
import {
  scanForHydrationIslands,
  findComponentPath,
  getHydrationRollupInputs,
  resolveIslandChunk,
  scanAppProviders,
} from './hydration/index.js';
import { writeScaffoldFile } from './project-language.js';

// Shared terminal output (functions that build their own `ui` shadow this one).
const ui = createUi();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Server-render the theme App to static HTML.
 * @param {string} themeRoot
 */
export async function renderStaticMarkup(themeRoot) {
  const renderScript = path.join(__dirname, 'render-theme.mts');
  const tsconfig = path.join(themeRoot, 'tsconfig.json');

  const args = [require.resolve('tsx/cli')];
  if (existsSync(tsconfig)) {
    args.push('--tsconfig', tsconfig);
  }
  args.push(renderScript, themeRoot);

  const result = await spawnAsync(process.execPath, args, {
    cwd: themeRoot,
    env: {
      ...process.env,
      INIT_CWD: themeRoot,
    },
    shell: false,
  });

  if (result.status !== 0) {
    const detail =
      result.stderr?.trim() || result.stdout?.trim() || 'Unknown error';
    throw new Error(`Static render failed:\n${detail}`);
  }

  if (result.stderr) {
    console.warn(result.stderr);
  }

  const outDir = result.stdout?.trim() || path.join(themeRoot, '.forgewp');
  const appHtmlPath = path.join(outDir, 'app.html');

  if (!existsSync(appHtmlPath)) {
    throw new Error(`Render output not found: ${appHtmlPath}`);
  }

  const headerHtmlPath = path.join(outDir, 'header.html');
  const footerHtmlPath = path.join(outDir, 'footer.html');
  const headHtmlPath = path.join(outDir, 'head.html');
  const singleHtmlPath = path.join(outDir, 'single.html');
  const singleHeadHtmlPath = path.join(outDir, 'single-head.html');
  const notFoundHtmlPath = path.join(outDir, '404.html');
  const archiveHtmlPath = path.join(outDir, 'archive.html');

  return {
    appHtml: readFileSync(appHtmlPath, 'utf8'),
    headerHtml: existsSync(headerHtmlPath)
      ? readFileSync(headerHtmlPath, 'utf8')
      : '',
    footerHtml: existsSync(footerHtmlPath)
      ? readFileSync(footerHtmlPath, 'utf8')
      : '',
    headHtml: existsSync(headHtmlPath)
      ? readFileSync(headHtmlPath, 'utf8')
      : '',
    singleHtml: existsSync(singleHtmlPath)
      ? readFileSync(singleHtmlPath, 'utf8')
      : '',
    singleHeadHtml: existsSync(singleHeadHtmlPath)
      ? readFileSync(singleHeadHtmlPath, 'utf8')
      : '',
    notFoundHtml: existsSync(notFoundHtmlPath)
      ? readFileSync(notFoundHtmlPath, 'utf8')
      : '',
    archiveHtml: existsSync(archiveHtmlPath)
      ? readFileSync(archiveHtmlPath, 'utf8')
      : '',
  };
}

/**
 * Generate the hydration runtime loader and manifest mappings for React hydration islands.
 * @param {string} themeRoot
 * @param {string} assetsOut
 * @param {string} distAssets
 * @param {string[]} hydrationIslands
 * @returns {string}
 */
export function generateHydrationRuntime(
  themeRoot,
  assetsOut,
  distAssets,
  hydrationIslands,
) {
  const manifestPath = path.join(themeRoot, 'dist', '.vite', 'manifest.json');
  let viteManifest = {};
  if (existsSync(manifestPath)) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse Vite manifest.json:', e.message);
    }
  } else {
    console.warn(
      'Hydration manifest not found at dist/.vite/manifest.json. Hydration asset generation may be incomplete.',
    );
  }

  const layoutProviders = scanAppProviders(themeRoot);
  for (const provider of layoutProviders) {
    if (!hydrationIslands.includes(provider.kebab)) {
      hydrationIslands = hydrationIslands.concat(provider.kebab);
    }
  }

  const mapping = {};
  let mainJsFile = '';
  const entryChunk =
    viteManifest['index.html'] ||
    Object.values(viteManifest).find((c) => c.isEntry);
  if (entryChunk) {
    mainJsFile = entryChunk.file;
  }

  for (const island of hydrationIslands) {
    const resolvedChunk = resolveIslandChunk(viteManifest, island);
    if (resolvedChunk) {
      mapping[island] = resolvedChunk;
    }
  }

  if (!mainJsFile) {
    throw new Error(
      `\n[ForgeWP Compiler Error] Hydration generation failed: could not resolve the React runtime entry chunk.\n` +
        `This usually happens if Vite failed to compile the entry file (e.g. src/main.tsx) or did not emit a manifest.json.\n` +
        `Ensure that you have run 'pnpm run build' inside your theme directory and that 'dist/.vite/manifest.json' exists.\n`,
    );
  }

  const missingIslands = hydrationIslands.filter(
    (island) => !(island in mapping),
  );
  if (missingIslands.length > 0) {
    const formattedComponents = missingIslands
      .map((island) => {
        return (
          island
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join('') + '.tsx'
        );
      })
      .join(', ');
    throw new Error(
      `\n[ForgeWP Compiler Error] Hydration generation failed: missing compiled chunk for island(s): ${missingIslands.join(', ')}.\n` +
        `Vite was unable to locate these hydration islands in its compilation manifest.\n` +
        `Verification Steps:\n` +
        ` 1. Ensure the React component(s) exist under 'src/components/' (e.g., ${formattedComponents}).\n` +
        ` 2. Ensure they are correctly exported and referenced via <Hydrate island="..."> in your page layout/components.\n` +
        ` 3. Check for syntax or import errors in these files that might have caused Vite compilation to skip or fail.\n`,
    );
  }

  const providerIdsJson = JSON.stringify(layoutProviders.map((p) => p.kebab));
  const hydratorScript = `(function () {
  const config = window.forgeWpHydration || { themeUri: "", manifest: {} };
  if (!config.providers) config.providers = ${providerIdsJson};
  window.ForgeWP = window.ForgeWP || {};
  window.ForgeWP.hydratedIslands = window.ForgeWP.hydratedIslands || new Set();
  window.ForgeWP.onHydrated = function(callback) {
    if (typeof callback !== "function") return;
    window.addEventListener("forgewp:hydrated", function(e) {
      callback(e.detail);
    });
  };

  // Cross-island DOM resolution bridge: guarantees that DOM queries captured
  // prior to asynchronous child island hydration resolve seamlessly to live elements.
  if (typeof Element !== "undefined" && !Element.prototype.__forgewpBound) {
    Element.prototype.__forgewpBound = true;
    const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (!this.isConnected) {
        if (this.id) {
          const live = document.getElementById(this.id);
          if (live && live !== this && live.isConnected) return origGetBoundingClientRect.call(live);
        }
        if (this.className && typeof this.className === "string") {
          const classes = this.className.trim().split(/\\s+/).filter(Boolean);
          for (let i = 0; i < classes.length; i++) {
            const cls = classes[i];
            if (!cls.startsWith("bg-") && !cls.startsWith("text-") && !cls.startsWith("p-") && !cls.startsWith("m-") && !cls.startsWith("flex") && !cls.startsWith("grid") && !cls.startsWith("w-") && !cls.startsWith("h-") && !cls.startsWith("border")) {
              try {
                const live = document.querySelector("." + (CSS.escape ? CSS.escape(cls) : cls));
                if (live && live !== this && live.isConnected) return origGetBoundingClientRect.call(live);
              } catch (e) {}
            }
          }
        }
        if (this.tagName) {
          try {
            const live = document.querySelector(this.tagName.toLowerCase());
            if (live && live !== this && live.isConnected) return origGetBoundingClientRect.call(live);
          } catch (e) {}
        }
      }
      return origGetBoundingClientRect.call(this);
    };

    if (typeof IntersectionObserver !== "undefined") {
      const origObserve = IntersectionObserver.prototype.observe;
      IntersectionObserver.prototype.observe = function (target) {
        if (!target) return;
        origObserve.call(this, target);
        const observer = this;
        window.ForgeWP.onHydrated(function () {
          if (!target.isConnected) {
            let live = null;
            if (target.id) live = document.getElementById(target.id);
            if (!live && target.className && typeof target.className === "string") {
              const classes = target.className.trim().split(/\\s+/).filter(Boolean);
              for (let i = 0; i < classes.length; i++) {
                const cls = classes[i];
                if (!cls.startsWith("bg-") && !cls.startsWith("text-") && !cls.startsWith("p-") && !cls.startsWith("m-") && !cls.startsWith("flex") && !cls.startsWith("grid") && !cls.startsWith("w-") && !cls.startsWith("h-") && !cls.startsWith("border")) {
                  try {
                    live = document.querySelector("." + (CSS.escape ? CSS.escape(cls) : cls));
                    if (live && live.isConnected) break;
                  } catch (e) {}
                }
              }
            }
            if (live && live.isConnected) {
              try { observer.unobserve(target); } catch (e) {}
              try { origObserve.call(observer, live); } catch (e) {}
            }
          }
        });
      };
    }
  }

  const allIslands = Array.from(document.querySelectorAll("[data-forgewp-hydrate]"));
  const islands = allIslands.filter((el) => {
    let parent = el.parentElement;
    while (parent) {
      if (parent.hasAttribute && parent.hasAttribute("data-forgewp-hydrate")) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });

  function firstObservableBox(el) {
    if (!el || el.nodeType !== 1) return null;
    try {
      const display = window.getComputedStyle(el).display;
      if (display !== "contents") return el;
    } catch (e) {
      return el;
    }
    for (let i = 0; i < el.children.length; i++) {
      const found = firstObservableBox(el.children[i]);
      if (found) return found;
    }
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        let node = entry.target;
        while (node && typeof node.__forgewpHydrate !== "function") {
          node = node.parentElement;
        }
        if (node && typeof node.__forgewpHydrate === "function") {
          node.__forgewpHydrate();
        }
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "200px" });

  // Predictive preloading observer with larger viewport margin (600px)
  const preloadObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        preloadElement(el);
        preloadObserver.unobserve(el);
      }
    });
  }, { rootMargin: "600px" });

  const StrategyRegistry = {
    load: (el, hydrate) => {
      if (document.readyState === "complete") {
        hydrate();
      } else {
        window.addEventListener("load", hydrate);
      }
    },
    visible: (el, hydrate) => {
      el.__forgewpHydrate = hydrate;
      const target = firstObservableBox(el);
      if (!target || (target === el && window.getComputedStyle(el).display === "contents")) {
        hydrate();
        return;
      }
      const rect = target.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom >= -200 && rect.right >= -200 && rect.top <= vh + 200 && rect.left <= vw + 200) {
        hydrate();
        return;
      }
      observer.observe(target);
    },
    interaction: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("click", run);
        el.removeEventListener("mouseenter", run);
        el.removeEventListener("focusin", run);
      };
      el.addEventListener("click", run);
      el.addEventListener("mouseenter", run);
      el.addEventListener("focusin", run);
    },
    click: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("click", run);
      };
      el.addEventListener("click", run);
    },
    hover: (el, hydrate) => {
      const run = () => {
        hydrate();
        el.removeEventListener("mouseenter", run);
      };
      el.addEventListener("mouseenter", run);
    },
    idle: (el, hydrate) => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(hydrate);
      } else {
        setTimeout(hydrate, 200);
      }
    }
  };

  islands.forEach((el) => {
    const islandName = el.getAttribute("data-forgewp-hydrate");

    // 1. Network-Aware Check: Restrict/skip hydration on slow 2G/3G connections if requested
    const connection = el.getAttribute("data-forgewp-connection");
    if (connection === "fast") {
      const conn = navigator.connection;
      if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType))) {
        console.warn("[ForgeWP Hydrator] Deferring hydration of island '" + islandName + "' due to slow 2G/3G network conditions.");
        return;
      }
    }

    // 2. Predictive Preloading Setup
    const preload = el.getAttribute("data-forgewp-preload");
    if (preload === "near-visible") {
      preloadObserver.observe(el);
    }

    const runHydration = () => hydrateElement(el);

    // 3. Media-Query Check: Gated by target device dimensions
    const media = el.getAttribute("data-forgewp-media");
    if (media) {
      const mql = window.matchMedia(media);
      const setupMediaHydration = () => {
        const trigger = el.getAttribute("data-forgewp-trigger") || "visible";
        const strategy = StrategyRegistry[trigger];
        if (strategy) {
          strategy(el, runHydration);
        } else {
          StrategyRegistry.visible(el, runHydration);
        }
      };

      if (mql.matches) {
        setupMediaHydration();
      } else {
        const listener = (e) => {
          if (e.matches) {
            setupMediaHydration();
            mql.removeEventListener("change", listener);
          }
        };
        mql.addEventListener("change", listener);
      }
      return;
    }

    // Standard trigger registration
    const trigger = el.getAttribute("data-forgewp-trigger") || "visible";
    const strategy = StrategyRegistry[trigger];
    if (strategy) {
      strategy(el, runHydration);
    } else {
      StrategyRegistry.visible(el, runHydration);
    }
  });

  // Native scroll-reveal observer for static layout animations (preserves 100% CSS grid/flex layout)
  if (typeof IntersectionObserver !== "undefined") {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("forgewp-in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll("[data-forgewp-reveal]").forEach((el) => {
      revealObserver.observe(el);
    });
  }

  function preloadElement(el) {
    const islandName = el.getAttribute("data-forgewp-hydrate");
    const chunkPath = config.manifest?.[islandName];
    if (!chunkPath) return;
    const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");
    
    // Inject link[rel=modulepreload]
    if (document.querySelector("link[href='" + scriptUrl + "']")) return;
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = scriptUrl;
    document.head.appendChild(link);
  }

  function hydrateElement(el) {
    const islandName = el.getAttribute("data-forgewp-hydrate");
    if (!islandName) {
      console.error("[ForgeWP Hydrator] Missing data-forgewp-hydrate attribute on hydration boundary.");
      return;
    }
    if (el.__forgewpHydrated) return;
    el.__forgewpHydrated = true;

    const rawProps = el.getAttribute("data-forgewp-props") || "{}";
    let props = {};
    try {
      props = JSON.parse(rawProps);
    } catch (err) {
      console.error("[ForgeWP Hydrator] Failed to parse props for island " + islandName + ":", err);
    }

    const chunkPath = config.manifest?.[islandName];
    if (!chunkPath) {
      const available = config.manifest ? Object.keys(config.manifest).join(", ") : "<none>";
      console.error(
        "[ForgeWP Hydrator] Could not find compiled chunk for island " + islandName + ". " +
        "Available manifest keys: " + available
      );
      return;
    }

    const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");

    import(scriptUrl)
      .then((module) => {
        const Component = resolveExport(module, islandName);
        if (!isReactComponentType(Component)) {
          const exportsList = Object.keys(module).join(", ");
          console.error(
            "[ForgeWP Hydrator] Chunk for " + islandName + " does not export a valid React component type. " +
            "Available exports: " + exportsList
          );
          return;
        }

        // Resolve ReactDOM/React — prefer window globals set by main.tsx.
        // Always use createRoot (not hydrateRoot): island chunks bundle their
        // own React via Vite code-splitting, so hydrateRoot from window.ReactDOM
        // (a different instance) causes a silent Fiber reconciler failure.
        // createRoot takes full ownership of the container, bypassing this issue.
        const ReactDOM = window.ReactDOM;
        const React = window.React;

        if (ReactDOM && React) {
          const backup = el.innerHTML;
          const needsProviders = el.getAttribute("data-forgewp-needs-providers") === "true";
          const providerReady = needsProviders ? loadProviderComponents() : Promise.resolve([]);
          providerReady.then(function (providerComponents) {
            const nextProps = Object.assign({}, props);
            if (el.getAttribute("data-forgewp-slot-children") === "true") {
              const ssrHtml = el.innerHTML;
              if (ssrHtml && String(ssrHtml).trim()) {
                nextProps.children = React.createElement("span", {
                  style: { display: "contents" },
                  dangerouslySetInnerHTML: { __html: ssrHtml },
                });
              }
            }
            let tree = React.createElement(Component, nextProps);
            for (let i = providerComponents.length - 1; i >= 0; i--) {
              tree = React.createElement(providerComponents[i], null, tree);
            }
            try {
              const root = ReactDOM.createRoot(el);
              root.render(tree);
              if (window.ForgeWP && window.ForgeWP.hydratedIslands) {
                window.ForgeWP.hydratedIslands.add(islandName);
              }
              const eventDetail = { island: islandName, element: el };
              window.dispatchEvent(new CustomEvent("forgewp:hydrated", { detail: eventDetail }));
              window.dispatchEvent(new CustomEvent("forgewp:island-ready", { detail: eventDetail }));
            } catch (err) {
              el.innerHTML = backup;
              console.error("[ForgeWP Hydrator] Render failed for " + islandName + ", restored SSR HTML:", err);
            }
          }).catch(function (err) {
            el.innerHTML = backup;
            console.error("[ForgeWP Hydrator] Provider wrap failed for " + islandName + ":", err);
          });
        } else {
          console.error("[ForgeWP Hydration Error] React or ReactDOM not found on window. Ensure main.tsx exposes window.React and window.ReactDOM.");
        }
      })
      .catch((err) => {
        console.error("[ForgeWP Hydrator] Failed to load chunk for " + islandName + ":", err);
      });
  }

  function isReactComponentType(value) {
    if (typeof value === "function" || typeof value === "string") return true;
    if (!value || typeof value !== "object") return false;
    const type = value.$$typeof;
    return type === Symbol.for("react.forward_ref") ||
      type === Symbol.for("react.memo") ||
      type === Symbol.for("react.lazy") ||
      type === Symbol.for("react.provider") ||
      type === Symbol.for("react.context");
  }

  function resolveExport(module, islandName) {
    if (!module || typeof module !== "object") return undefined;
    const pascalName = islandName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);

    if (isReactComponentType(module[pascalName])) return module[pascalName];
    if (isReactComponentType(module[camelName])) return module[camelName];
    if (isReactComponentType(module.default)) return module.default;

    const keys = Object.keys(module);
    for (let i = 0; i < keys.length; i++) {
      const val = module[keys[i]];
      if (isReactComponentType(val)) {
        const componentName = val.displayName || val.name || (val.render && val.render.name);
        if (componentName === pascalName || componentName === camelName) return val;
      }
    }

    const cleanIsland = islandName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.toLowerCase() === cleanIsland && isReactComponentType(module[k])) {
        return module[k];
      }
    }

    const componentKeys = keys.filter(function (k) {
      return isReactComponentType(module[k]);
    });
    if (componentKeys.length === 1) return module[componentKeys[0]];

    const nonHooks = componentKeys.filter(function (k) {
      const component = module[k];
      const componentName = component.displayName || component.name || (component.render && component.render.name) || k;
      return !/^use[A-Z]/.test(componentName);
    });
    if (nonHooks.length === 1) return module[nonHooks[0]];

    if (islandName.endsWith("-provider") || islandName.includes("provider")) {
      const provMatch = componentKeys.find(function (k) {
        const component = module[k];
        const componentName = component.displayName || component.name || (component.render && component.render.name) || k;
        return /Provider$/i.test(componentName);
      });
      if (provMatch) return module[provMatch];
    }

    if (nonHooks.length > 0) return module[nonHooks[0]];
    if (componentKeys.length > 0) return module[componentKeys[0]];
    return undefined;
  }

  let providerComponentsPromise = null;
  function loadProviderComponents() {
    if (providerComponentsPromise) return providerComponentsPromise;
    const ids = config.providers || [];
    if (!ids.length) {
      providerComponentsPromise = Promise.resolve([]);
      return providerComponentsPromise;
    }
    providerComponentsPromise = Promise.all(ids.map(function (id) {
      const chunkPath = config.manifest && config.manifest[id];
      if (!chunkPath) return Promise.resolve(null);
      const scriptUrl = config.themeUri + "/assets/" + chunkPath.replace("assets/", "").replace("assets\\\\", "");
      return import(scriptUrl).then(function (module) {
        return resolveExport(module, id);
      }).catch(function (err) {
        console.error("[ForgeWP Hydrator] Failed to load provider " + id + ":", err);
        return null;
      });
    })).then(function (list) {
      return list.filter(function (component) { return isReactComponentType(component); });
    });
    return providerComponentsPromise;
  }
})();`;

  writeFileSync(
    path.join(assetsOut, 'forgewp-hydrator.js'),
    hydratorScript,
    'utf8',
  );
  return JSON.stringify({
    mainJsFile,
    mapping,
  });
}

export function getCriticalFiles(themeRoot) {
  return [
    'wp.config.ts',
    'index.html',
    'package.json',
    'src/main.tsx',
    'src/app/layout.tsx',
    'src/app/routes.tsx',
  ];
}

export async function onFresh(themeRoot) {
  const routesPath = path.join(themeRoot, 'src', 'app', 'routes.tsx');
  const pagePath = path.join(themeRoot, 'src', 'app', 'page.tsx');

  const routesContent = `import type { ComponentType, ReactNode } from "react";
import { Route, Switch } from "@forgewp/react";
import * as HomePage from "./page";

/**
 * Automatically discover all layouts in src/app/layouts via Vite eager glob.
 * Any layout file created (e.g. dashboard.tsx, auth.tsx, blank.tsx) is instantly
 * available without needing manual imports or registration.
 */
const layoutModules = import.meta.glob<Record<string, any>>("./layouts/*.{tsx,jsx,ts,js}", { eager: true });
const layouts: Record<string, ComponentType<{ children: ReactNode }>> = {};

for (const filePath in layoutModules) {
  const match = filePath.match(/\\/([^/]+)\\.(tsx|jsx|ts|js)$/);
  if (match) {
    const layoutName = match[1];
    const mod = layoutModules[filePath];
    const comp = mod.default || Object.values(mod).find((v) => typeof v === "function");
    if (comp) {
      layouts[layoutName] = comp as ComponentType<{ children: ReactNode }>;
    }
  }
}

/**
 * Layout-aware wrapper for local React dev routing.
 * Resolves layout dynamically from \`export const pageConfig = { layout: '...' }\`
 */
function withLayout(componentOrModule: any, customConfig?: any) {
  return function PageWithLayout(props: any) {
    const Component =
      typeof componentOrModule === "function"
        ? componentOrModule
        : componentOrModule?.default || (() => null);

    const config =
      customConfig ||
      componentOrModule?.pageConfig ||
      (Component as any)?.pageConfig ||
      {};

    const layoutKey = config.layout ?? "default";

    if (layoutKey === false || layoutKey === "blank") {
      const BlankLayout = layouts["blank"] || (({ children }: any) => <>{children}</>);
      return (
        <BlankLayout>
          <Component {...props} />
        </BlankLayout>
      );
    }

    const Layout = layouts[layoutKey] || layouts["default"] || (({ children }: any) => <>{children}</>);

    return (
      <Layout>
        <Component {...props} />
      </Layout>
    );
  };
}

/**
 * Local Developer Routes — ForgeWP.
 *
 * Edit this file to add new routes/components for your local Vite preview server.
 *
 * @example
 * // 1. Create a component in src/app/about.tsx
 * // 2. Import it here: import * as AboutPage from "./about";
 * // 3. Add the Route: <Route path="/about" component={withLayout(AboutPage)} />
 */
export default function AppRoutes() {
  return (
    <Switch>
      {/* Home preview */}
      <Route path="/" component={withLayout(HomePage)} />

      {/* Fallback route */}
      <Route
        component={withLayout(() => (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
            <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
            <p className="mt-2 text-zinc-600">Page not found locally.</p>
            <div className="mt-4 flex flex-col items-center gap-2 text-sm">
              <a href="/" className="text-brand font-semibold hover:underline">← Go back home</a>
            </div>
          </div>
        ))}
      />
    </Switch>
  );
}
`;

  const pageContent = `import type { CSSProperties } from "react";
import { Hydrate, WpHead } from "@forgewp/react";
import { ArrowUpRight, Github } from "lucide-react";
import { ForgeWPLogo, ReactLogo, ViteLogo } from "../components/brand-logos";
import { ThemeHotkey } from "../components/theme-hotkey";

export default function HomePage() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-hidden bg-[#0f1117] px-5 light:bg-[#f6f5f3] py-5 font-sans selection:bg-forgewp selection:text-white sm:px-10 sm:py-6 lg:px-16 lg:[@media(max-height:720px)]:py-4">
      <WpHead
        title="ForgeWP — React & Tailwind Compiler for WordPress"
        description="A premium developer framework for creating modern Gutenberg block-themes using React."
        ogType="website"
      />

      {/* Contour wave artwork, fading out toward the text */}
      <WaveLines className="forgewp-wave pointer-events-none absolute -right-24 top-16 -z-10 h-[440px] w-[460px] opacity-35 sm:-right-6 sm:top-20 sm:h-[600px] sm:w-[600px] sm:opacity-60 lg:-right-4 lg:top-[9%] lg:h-[96%] lg:w-[70%] lg:opacity-100" />

      {/* ── HEADER: ForgeWP | stack, centred ── */}
      <div className="flex items-center justify-center gap-5">
        <div className="flex items-center gap-2.5 select-none">
          <ForgeWPLogo className="h-6 w-auto text-stone-100 light:text-[#09090b]" />
          <span className="font-heading text-[21px] font-bold tracking-tight text-stone-100 light:text-slate-950">
            ForgeWP
          </span>
        </div>
        <span aria-hidden="true" className="h-7 w-px bg-[#3a3d45] light:bg-stone-300" />
        <div className="flex items-center gap-3">
          <ViteLogo className="h-6 w-6" />
          <ReactLogo className="h-6 w-6" />
        </div>
        {/* Press "d" to toggle dark mode */}
        <Hydrate id="theme-hotkey" trigger="load">
          <ThemeHotkey />
        </Hydrate>
      </div>

      {/* ── HERO ── */}
      <section className="flex flex-1 items-center py-10 lg:py-4 lg:[@media(max-height:720px)]:py-2">
        <div className="max-w-xl">
          <h1 className="mb-4 font-heading text-4xl font-bold leading-[1.02] tracking-tight text-stone-100 light:text-slate-950 sm:text-5xl xl:text-6xl lg:[@media(max-height:720px)]:mb-3 lg:[@media(max-height:720px)]:text-[44px]">
            React structure.
            <br />
            Tailwind speed.
            <br />
            <span className="text-forgewp">WordPress power.</span>
          </h1>

          <p className="mb-11 max-w-md text-sm leading-relaxed text-stone-400 light:text-stone-600 sm:text-[15px] lg:[@media(max-height:720px)]:mb-8 lg:[@media(max-height:720px)]:text-sm">
            Build your theme with React components, mock data and Tailwind. The
            ForgeWP compiler turns it into a standard WordPress theme with native
            Gutenberg blocks.
          </p>

          {/* CTAs match the forgewp.dev landing hero: tinted brand button + text link */}
          <div className="flex flex-wrap items-center gap-x-[26px] gap-y-4">
            <a
              href="https://forgewp.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-[4px] bg-[linear-gradient(110deg,color-mix(in_oklab,var(--color-forgewp)_10%,transparent),color-mix(in_oklab,#f59e0b_10%,transparent))] px-[22px] py-[14px] text-base font-semibold text-forgewp shadow-[0_1px_2px_#0000000d] transition-[background] duration-200 hover:bg-[linear-gradient(110deg,color-mix(in_oklab,var(--color-forgewp)_16%,transparent),color-mix(in_oklab,#f59e0b_16%,transparent))]"
            >
              Read the docs
            </a>
            <a
              href="https://github.com/El-dorado01/ForgeWP"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[11px] text-base text-stone-300 light:text-[#344154] transition-colors duration-200 hover:text-forgewp"
            >
              <Github size={16} />
              View on GitHub
              <ArrowUpRight size={16} />
            </a>
          </div>

          <p className="mt-14 font-mono text-[13px] text-stone-400 light:text-stone-500 lg:[@media(max-height:720px)]:mt-9">
            Edit{" "}
            <code className="text-stone-300 light:text-slate-800">src/app/page.tsx</code>{" "}
            and save to see your changes.
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * Flowing contour lines: each line falls from the top edge to the bottom edge and bends
 * around a shared fold. Dash length grows from left to right so the field reads as
 * dotted at the outer edge and solid near the fold. Computed at render time, so it
 * compiles to plain SVG in the exported theme.
 */
function WaveLines({ className }: { className?: string }) {
  const width = 600;
  const height = 640;
  const count = 17;
  const samples = 48;

  const lines = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 = outer (left) edge, 1 = fold
    const baseX = 150 + t * 520; // spreads into the page centre; the solid line runs off the right edge
    const points: string[] = [];
    for (let s = 0; s <= samples; s++) {
      const v = s / samples; // 0 = top, 1 = bottom
      const y = v * (height + 40);
      // Fold bulges left through the middle and swings back near the bottom.
      const fold = Math.sin(v * Math.PI * 1.15 + 0.35) * (70 + t * 120);
      const ripple = Math.sin(v * Math.PI * 3 + t * 2.2) * (10 + t * 14);
      const x = baseX - fold * (0.35 + t * 0.65) + ripple;
      points.push(\`\${s === 0 ? "M" : "L"}\${x.toFixed(1)} \${y.toFixed(1)}\`);
    }
    return { d: points.join(""), t };
  });

  return (
    <svg
      viewBox={\`0 0 \${width} \${height}\`}
      preserveAspectRatio="xMaxYMin slice"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {lines.map(({ d, t }, i) => {
        const solid = i === count - 1; // the last line is solid; the rest are dashed
        // Outer lines are dots (near-zero dash with round caps); dashes lengthen toward the fold.
        const dash = 0.01 + t * t * 9;
        const gap = 6 - t * 3.2;
        // Motion lives in globals.css (.forgewp-wave); these variables tune it per line.
        const motion = {
          "--wave-i": i,
          "--wave-period": (dash + gap).toFixed(2),
          "--wave-flow": \`\${((dash + gap) / 6).toFixed(2)}s\`,
        } as CSSProperties;
        return (
          <path
            key={i}
            d={d}
            stroke={solid ? "#f97316" : "#18181b"}
            strokeWidth={solid ? 1.8 : 1.4 + t * 0.6}
            strokeLinecap="round"
            strokeDasharray={solid ? undefined : \`\${dash.toFixed(2)} \${gap.toFixed(2)}\`}
            opacity={solid ? 0.9 : 0.18 + t * 0.62}
            data-solid={solid ? "" : undefined}
            style={motion}
          />
        );
      })}
    </svg>
  );
}
`;

  const brandLogosContent = `import type { SVGProps } from "react";

/**
 * Inline brand marks for the starter home page.
 * Inline SVG keeps them working in local Vite dev and in the exported WordPress theme
 * without any asset pipeline.
 *
 * Vite and React marks: Devicon v2.16.0 (MIT). Trademarks belong to their owners.
 */

export function ForgeWPLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 44 40" fill="none" aria-label="ForgeWP" role="img" {...props}>
      {/* Bars use currentColor (set a text colour on the svg); the dot is brand orange. */}
      <g fill="currentColor">
        <path d="M5 0H40.2Q44 0 41.19 2.56L33 10H5A5 5 0 0 1 5 0Z" />
        <path d="M5 15H22.6Q26.4 15 23.59 17.56L15.4 25H5A5 5 0 0 1 5 15Z" />
        <path d="M5 30H13Q16.8 30 13.99 32.56L5.8 40H5A5 5 0 0 1 5 30Z" />
      </g>
      <circle cx="39" cy="20" r="5" fill="#f97316" />
    </svg>
  );
}

export function ViteLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 128 128" aria-label="Vite" role="img" {...props}>
      <defs>
        <linearGradient
          id="forgewp-vite-a"
          x1="6"
          x2="235"
          y1="33"
          y2="344"
          gradientTransform="translate(0 .937) scale(.3122)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#41d1ff" />
          <stop offset="1" stopColor="#bd34fe" />
        </linearGradient>
        <linearGradient
          id="forgewp-vite-b"
          x1="194.651"
          x2="236.076"
          y1="8.818"
          y2="292.989"
          gradientTransform="translate(0 .937) scale(.3122)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffea83" />
          <stop offset=".083" stopColor="#ffdd35" />
          <stop offset="1" stopColor="#ffa800" />
        </linearGradient>
      </defs>
      <path
        fill="url(#forgewp-vite-a)"
        d="M124.766 19.52 67.324 122.238c-1.187 2.121-4.234 2.133-5.437.024L3.305 19.532c-1.313-2.302.652-5.087 3.261-4.622L64.07 25.187a3.09 3.09 0 0 0 1.11 0l56.3-10.261c2.598-.473 4.575 2.289 3.286 4.594Zm0 0"
      />
      <path
        fill="url(#forgewp-vite-b)"
        d="M91.46 1.43 48.954 9.758a1.56 1.56 0 0 0-1.258 1.437l-2.617 44.168a1.563 1.563 0 0 0 1.91 1.614l11.836-2.735a1.562 1.562 0 0 1 1.88 1.836l-3.517 17.219a1.562 1.562 0 0 0 1.985 1.805l7.308-2.223c1.133-.344 2.223.652 1.985 1.812l-5.59 27.047c-.348 1.692 1.902 2.614 2.84 1.164l.625-.968 34.64-69.13c.582-1.16-.421-2.48-1.69-2.234l-12.185 2.352a1.558 1.558 0 0 1-1.793-1.965l7.95-27.562A1.56 1.56 0 0 0 91.46 1.43Zm0 0"
      />
    </svg>
  );
}

export function ReactLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 128 128" aria-label="React" role="img" {...props}>
      <g fill="#61DAFB">
        <circle cx="64" cy="64" r="11.4" />
        <path d="M107.3 45.2c-2.2-.8-4.5-1.6-6.9-2.3.6-2.4 1.1-4.8 1.5-7.1 2.1-13.2-.2-22.5-6.6-26.1-1.9-1.1-4-1.6-6.4-1.6-7 0-15.9 5.2-24.9 13.9-9-8.7-17.9-13.9-24.9-13.9-2.4 0-4.5.5-6.4 1.6-6.4 3.7-8.7 13-6.6 26.1.4 2.3.9 4.7 1.5 7.1-2.4.7-4.7 1.4-6.9 2.3C8.2 50 1.4 56.6 1.4 64s6.9 14 19.3 18.8c2.2.8 4.5 1.6 6.9 2.3-.6 2.4-1.1 4.8-1.5 7.1-2.1 13.2.2 22.5 6.6 26.1 1.9 1.1 4 1.6 6.4 1.6 7.1 0 16-5.2 24.9-13.9 9 8.7 17.9 13.9 24.9 13.9 2.4 0 4.5-.5 6.4-1.6 6.4-3.7 8.7-13 6.6-26.1-.4-2.3-.9-4.7-1.5-7.1 2.4-.7 4.7-1.4 6.9-2.3 12.5-4.8 19.3-11.4 19.3-18.8s-6.8-14-19.3-18.8zM92.5 14.7c4.1 2.4 5.5 9.8 3.8 20.3-.3 2.1-.8 4.3-1.4 6.6-5.2-1.2-10.7-2-16.5-2.5-3.4-4.8-6.9-9.1-10.4-13 7.4-7.3 14.9-12.3 21-12.3 1.3 0 2.5.3 3.5.9zM81.3 74c-1.8 3.2-3.9 6.4-6.1 9.6-3.7.3-7.4.4-11.2.4-3.9 0-7.6-.1-11.2-.4-2.2-3.2-4.2-6.4-6-9.6-1.9-3.3-3.7-6.7-5.3-10 1.6-3.3 3.4-6.7 5.3-10 1.8-3.2 3.9-6.4 6.1-9.6 3.7-.3 7.4-.4 11.2-.4 3.9 0 7.6.1 11.2.4 2.2 3.2 4.2 6.4 6 9.6 1.9 3.3 3.7 6.7 5.3 10-1.7 3.3-3.4 6.6-5.3 10zm8.3-3.3c1.5 3.5 2.7 6.9 3.8 10.3-3.4.8-7 1.4-10.8 1.9 1.2-1.9 2.5-3.9 3.6-6 1.2-2.1 2.3-4.2 3.4-6.2zM64 97.8c-2.4-2.6-4.7-5.4-6.9-8.3 2.3.1 4.6.2 6.9.2 2.3 0 4.6-.1 6.9-.2-2.2 2.9-4.5 5.7-6.9 8.3zm-18.6-15c-3.8-.5-7.4-1.1-10.8-1.9 1.1-3.3 2.3-6.8 3.8-10.3 1.1 2 2.2 4.1 3.4 6.1 1.2 2.2 2.4 4.1 3.6 6.1zm-7-25.5c-1.5-3.5-2.7-6.9-3.8-10.3 3.4-.8 7-1.4 10.8-1.9-1.2 1.9-2.5 3.9-3.6 6-1.2 2.1-2.3 4.2-3.4 6.2zM64 30.2c2.4 2.6 4.7 5.4 6.9 8.3-2.3-.1-4.6-.2-6.9-.2-2.3 0-4.6.1-6.9.2 2.2-2.9 4.5-5.7 6.9-8.3zm22.2 21l-3.6-6c3.8.5 7.4 1.1 10.8 1.9-1.1 3.3-2.3 6.8-3.8 10.3-1.1-2.1-2.2-4.2-3.4-6.2zM31.7 35c-1.7-10.5-.3-17.9 3.8-20.3 1-.6 2.2-.9 3.5-.9 6 0 13.5 4.9 21 12.3-3.5 3.8-7 8.2-10.4 13-5.8.5-11.3 1.4-16.5 2.5-.6-2.3-1-4.5-1.4-6.6zM7 64c0-4.7 5.7-9.7 15.7-13.4 2-.8 4.2-1.5 6.4-2.1 1.6 5 3.6 10.3 6 15.6-2.4 5.3-4.5 10.5-6 15.5C15.3 75.6 7 69.6 7 64zm28.5 49.3c-4.1-2.4-5.5-9.8-3.8-20.3.3-2.1.8-4.3 1.4-6.6 5.2 1.2 10.7 2 16.5 2.5 3.4 4.8 6.9 9.1 10.4 13-7.4 7.3-14.9 12.3-21 12.3-1.3 0-2.5-.3-3.5-.9zM96.3 93c1.7 10.5.3 17.9-3.8 20.3-1 .6-2.2.9-3.5.9-6 0-13.5-4.9-21-12.3 3.5-3.8 7-8.2 10.4-13 5.8-.5 11.3-1.4 16.5-2.5.6 2.3 1 4.5 1.4 6.6zm9-15.6c-2 .8-4.2 1.5-6.4 2.1-1.6-5-3.6-10.3-6-15.6 2.4-5.3 4.5-10.5 6-15.5 13.8 4 22.1 10 22.1 15.6 0 4.7-5.8 9.7-15.7 13.4z" />
      </g>
    </svg>
  );
}
`;

  const themeHotkeyContent = `import { useEffect } from "react";

/** localStorage key holding an explicit "light" | "dark" choice. */
const THEME_STORAGE_KEY = "forgewp-theme";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Press "d" to toggle light/dark. Dark is the default; the choice is remembered in
 * localStorage. Renders nothing; the home page hydrates it as an island so the
 * hotkey also works in the exported WordPress theme.
 */
export function ThemeHotkey() {
  useEffect(() => {
    const root = document.documentElement;

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if ((saved === "dark" || saved === "light") && !root.classList.contains(saved)) {
        root.classList.remove("light", "dark");
        root.classList.add(saved);
      }
    } catch {
      // Storage unavailable: stay on the default (dark).
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "d" || isTypingTarget(event.target)) return;

      const next = root.classList.contains("light") ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); the toggle still applies.
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

export default ThemeHotkey;
`;

  try {
    writeFileSync(routesPath, routesContent, 'utf8');
    console.log(
      ui.done("Reset routes definition", "src/app/routes.tsx"),
    );
  } catch (err) {
    console.log(
      ui.error(`Failed to reset src/app/routes.tsx`, err.message),
    );
  }

  try {
    writeFileSync(pagePath, pageContent, 'utf8');
    console.log(ui.done("Reset core template", "src/app/page.tsx"));
  } catch (err) {
    console.log(
      ui.error(`Failed to reset src/app/page.tsx`, err.message),
    );
  }

  // The welcome page imports components from src/components, which fresh prunes.
  const welcomeComponents = [
    ['brand-logos.tsx', brandLogosContent, 'Restored welcome logos'],
    ['theme-hotkey.tsx', themeHotkeyContent, 'Restored theme hotkey'],
  ];
  for (const [file, content, label] of welcomeComponents) {
    try {
      mkdirSync(path.join(themeRoot, 'src', 'components'), { recursive: true });
      writeFileSync(path.join(themeRoot, 'src', 'components', file), content, 'utf8');
      console.log(ui.done(label, `src/components/${file}`));
    } catch (err) {
      console.log(ui.error(`Failed to restore src/components/${file}`, err.message));
    }
  }
}

export function onMakeBlock(
  themeRoot,
  { pascalCase, readableTitle, attributesList, pc },
) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(pascalCase)) {
    throw new Error('Block names must start with a letter and produce a valid component name.');
  }
  if (!Array.isArray(attributesList) || !attributesList.length || attributesList.some((name) =>
    typeof name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || name === '__proto__'
  ) || new Set(attributesList).size !== attributesList.length) {
    throw new Error('Attribute names must be unique JavaScript property identifiers, such as title or cta_label. make:block creates string attributes; edit their types in source.');
  }
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  if (!existsSync(blocksDir)) {
    mkdirSync(blocksDir, { recursive: true });
  }

  const targetFile = path.join(blocksDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(ui.errorBlock(`Already exists: src/blocks/${pascalCase}.tsx`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  const nameSlug = pascalCase
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  const attributesRegistry = attributesList
    .map((a) => `    ${a}: { type: "string", default: "Customize ${a} here" }`)
    .join(',\n');

  const editFields = attributesList
    .map((a) => {
      const cleanLabel = a
        .replace(/_/g, ' ')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());

      if (a === 'content' || a === 'description' || a === 'body') {
        return `<div className="border border-slate-100 p-4 bg-slate-50/30 rounded-none">
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">${cleanLabel}</label>
            <textarea 
              value={attributes.${a}} 
              onChange={(e) => setAttributes({ ${a}: e.target.value })}
              className="w-full p-2 border border-slate-200 bg-white font-sans text-xs focus:ring-0 focus:outline-none focus:border-primary rounded-none shadow-sm"
              rows={3}
              placeholder="Enter ${cleanLabel} content..."
            />
          </div>`;
      }
      return `<div className="border border-slate-100 p-4 bg-slate-50/30 rounded-none">
            <label className="block text-xs font-mono font-bold uppercase text-slate-700 mb-1">${cleanLabel}</label>
            <input 
              type="text" 
              value={attributes.${a}} 
              onChange={(e) => setAttributes({ ${a}: e.target.value })}
              className="w-full p-2 border border-slate-200 bg-white font-sans text-xs focus:ring-0 focus:outline-none focus:border-primary rounded-none shadow-sm" 
              placeholder="Enter ${cleanLabel}..."
            />
          </div>`;
    })
    .join('\n          ');

  const saveLayout = attributesList
    .map((attr, index) => {
      if (index === 0) {
        return `<h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">
          {attributes.${attr}}
        </h3>`;
      }
      if (
        attr.toLowerCase().includes('image') ||
        attr.toLowerCase().includes('pic') ||
        attr.toLowerCase().includes('img')
      ) {
        return `<img src={attributes.${attr}} alt="Block Media" className="w-full border border-slate-100 shadow-md mb-3" />`;
      }
      return `<p className="text-sm text-slate-600 font-medium font-sans leading-relaxed mb-3">
          {attributes.${attr}}
        </p>`;
    })
    .join('\n        ');

  const blockTemplate = `import { defineBlock } from "@forgewp/react";

/**
 * ⚡ ForgeWP Custom Gutenberg Block — "Sharp ${readableTitle}"
 * 
 * LOCAL PREVIEW: Import this definition and pass it in BlockArea.previewBlocks.
 * Use the map key forgewp/${nameSlug}. The current mock post's serialized content
 * selects block instances, their order, and saved attributes.
 * This generated TSX is editable source; export creates WordPress block assets.
 */
export default defineBlock({
  name: "${nameSlug}",
  title: "Sharp ${readableTitle}",
  category: "design",
  icon: "admin-post", // Choose icons from: https://developer.wordpress.org/resource/dashicons/
  attributes: {
${attributesRegistry}
  },
  edit: ({ attributes, setAttributes }) => {
    return (
      <div className="p-8 bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-none my-6 selection:bg-brand selection:text-white">
        <span className="inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 mb-4">
          Gutenberg Custom Block (Edit Mode)
        </span>
        <div className="space-y-4">
          ${editFields}
        </div>
      </div>
    );
  },
  save: ({ attributes }) => {
    return (
      <div className="p-8 bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-none my-6 selection:bg-brand selection:text-white">
        <span className="inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 mb-3">
          Gutenberg Custom Block
        </span>
        ${saveLayout}
      </div>
    );
  }
});
`;

  const { writtenPath } = writeScaffoldFile(themeRoot, targetFile, blockTemplate);

  console.log(`\n${ui.created('block', pascalCase, path.relative(themeRoot, writtenPath).replaceAll('\\', '/'))}`);
  console.log(ui.detail(`Gutenberg title "Sharp ${readableTitle}". Export generates block.json, render.php and editor assets.`));
  console.log(`${ui.hint('Next', `${ui.command('pnpm forgewp export')} ${ui.c.dim('registers it in your WordPress theme')}`)}\n`);
}

/**
 * Scaffold a parent shell block (layout + InnerBlocks). No content attributes.
 * @param {string} themeRoot
 * @param {object} opts
 */
export function onMakeShell(
  themeRoot,
  {
    pascalCase,
    nameSlug,
    readableTitle,
    childrenSlugs = [],
    shell = {},
    innerBlocks = {},
    category = 'theme',
    icon = 'columns',
    description = '',
    pc: colors,
  },
) {
  const log = colors || pc;
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  if (!existsSync(blocksDir)) {
    mkdirSync(blocksDir, { recursive: true });
  }

  const targetFile = path.join(blocksDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(
      log.red(
        `\n❌ Error: Block "${pascalCase}.tsx" already exists at src/blocks/\n`,
      ),
    );
    process.exit(1);
  }

  const slug =
    nameSlug ||
    pascalCase
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

  const title = readableTitle || pascalCase.replace(/([A-Z])/g, ' $1').trim();
  const className =
    shell.className || 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16';
  const gridClassName =
    shell.gridClassName ||
    'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center';

  const allowed = Array.isArray(innerBlocks.allowedBlocks)
    ? innerBlocks.allowedBlocks
    : childrenSlugs;
  const template = Array.isArray(innerBlocks.template)
    ? innerBlocks.template
    : allowed.map((s) => [s]);
  const templateLock =
    innerBlocks.templateLock === undefined ? false : innerBlocks.templateLock;
  const orientation = innerBlocks.orientation || 'horizontal';

  const allowedLit = allowed.length
    ? `[\n${allowed.map((s) => `      ${JSON.stringify(s)},`).join('\n')}\n    ]`
    : 'undefined';
  const templateLit = template.length
    ? `[\n${template
        .map((row) => {
          const name = Array.isArray(row) ? row[0] : row;
          return `      ${JSON.stringify(Array.isArray(row) ? row : [name])},`;
        })
        .join('\n')}\n    ]`
    : 'undefined';

  const lockLit =
    templateLock === false
      ? 'false'
      : templateLock === true
        ? 'true'
        : JSON.stringify(templateLock);

  const descLit = JSON.stringify(
    description ||
      `Layout shell for ${title}${allowed.length ? ` (${allowed.join(' + ')})` : ''}`,
  );

  const shellTemplate = `import { defineBlock } from '@forgewp/react';

/**
 * Parent shell — layout only (InnerBlocks).
 *
 * Children are normal ForgeWP blocks. This shell provides the outer chrome +
 * grid; the compiler generates the editor UI and PHP wrapper from
 * \`innerBlocks\` + \`shell\`.
 *
 * Scaffolded by: pnpm forgewp make:shell
 */
export default defineBlock({
  name: '${slug}',
  title: ${JSON.stringify(title)},
  category: ${JSON.stringify(category)},
  icon: ${JSON.stringify(icon)},
  description: ${descLit},
  // No content attributes — children own their fields.
  attributes: {},
  innerBlocks: {
    allowedBlocks: ${allowedLit},
    template: ${templateLit},
    templateLock: ${lockLit},
    orientation: ${JSON.stringify(orientation)},
  },
  shell: {
    className: ${JSON.stringify(className)},
    gridClassName: ${JSON.stringify(gridClassName)},
  },
  // Compiler generates the real editor UI from innerBlocks + shell.
  edit: () => null,
});
`;

  const { writtenPath } = writeScaffoldFile(themeRoot, targetFile, shellTemplate);

  console.log(`\n${ui.created('shell', pascalCase, path.relative(themeRoot, writtenPath).replaceAll('\\', '/'))}`);
  console.log(ui.detail(`Block forgewp/${slug} · layout ${gridClassName}`));
  console.log(ui.detail(`Children: ${allowed.length ? allowed.join(', ') : 'none yet (any block can be added in the editor)'}`));
  console.log(`${ui.hint('Next', `${ui.command('pnpm forgewp export')} ${ui.c.dim('registers it in WordPress')}`)}\n`);
}

export function onMakeLoop(
  themeRoot,
  { pascalCase, postType, customFields, automaticallySeeded, pc },
) {
  const loopsDir = path.join(themeRoot, 'src', 'loops');
  if (!existsSync(loopsDir)) {
    mkdirSync(loopsDir, { recursive: true });
  }

  const targetFile = path.join(loopsDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(ui.errorBlock(`Already exists: src/loops/${pascalCase}.tsx`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  let customFieldsMarkup = '';
  if (customFields.length > 0) {
    customFieldsMarkup = customFields
      .map((f) => {
        const cleanLabel = f
          .replace(/_/g, ' ')
          .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());
        return `<div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-mono text-slate-500">
              <span>${cleanLabel}:</span>
              <span className="font-bold text-slate-800">{useWpCustomField("${f}")}</span>
            </div>`;
      })
      .join('\n            ');
  } else {
    customFieldsMarkup = `{/* No custom fields registered in mock-data.json. Add fields by running forgewp make:post-type */}\n            <p className="text-xs text-zinc-500 font-mono italic">No custom fields configured for post type: ${postType}</p>`;
  }

  const loopTemplate = `import { WpQueryLoop, useWpTitle, useWpFeaturedImage, useWpExcerpt, useWpPermalink, useWpCustomField } from "@forgewp/react";

/**
 * ⚡ ForgeWP Custom Post Type Loop — "${pascalCase}"
 * 
 * This loop dynamically queries and renders records of the "${postType}" post type.
 * In local development, the post data and custom fields are fetched dynamically from
 * your local JSON database file at: \`cms/mock-data.json\`.
 */
export default function ${pascalCase}() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Banner */}
        <div className="mb-12 border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50">
          <span className="inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 mb-4">
            Post Loop
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
            Latest ${postType.charAt(0).toUpperCase() + postType.slice(1)} Feed
          </h1>
          <p className="text-sm font-mono font-medium text-slate-500 mt-2">
            Dynamic Post-Type Loop &bull; Querying: "${postType}"
          </p>
        </div>

        {/* Post Grid Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <WpQueryLoop postType="${postType}" postsPerPage={6}>
            <article className="bg-white border border-slate-100 p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-none flex flex-col justify-between">
              <div>
                <div className="relative aspect-video w-full border border-slate-100 overflow-hidden mb-4 bg-slate-50/50">
                  <img 
                    src={useWpFeaturedImage()} 
                    alt={useWpTitle()} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3 hover:text-primary transition-colors">
                  <a href={useWpPermalink()}>{useWpTitle()}</a>
                </h3>
                <p className="text-sm text-slate-500 font-sans leading-relaxed mb-6">
                  {useWpExcerpt()}
                </p>
              </div>

              <div className="space-y-2 mt-auto">
            ${customFieldsMarkup}
              </div>
            </article>
          </WpQueryLoop>
        </div>
      </div>
    </div>
  );
}
`;

  const { writtenPath } = writeScaffoldFile(themeRoot, targetFile, loopTemplate);

  console.log(`\n${ui.created('loop', pascalCase, path.relative(themeRoot, writtenPath).replaceAll('\\', '/'))}`);
  console.log(ui.detail(`Lists "${postType}" posts${customFields.length ? ` with ${customFields.join(', ')}` : ''}.`));
  if (automaticallySeeded) {
    console.log(ui.detail(`"${postType}" was not in your mock data yet, so it was added with sample posts.`));
  }
  console.log(`${ui.hint('Use', ui.command(`import ${pascalCase} from "@/loops/${pascalCase}";`))}\n`);
}

export function onMakeIsland(themeRoot, { pascalCase, pc }) {
  const componentsDir = path.join(themeRoot, 'src', 'components');
  if (!existsSync(componentsDir)) {
    mkdirSync(componentsDir, { recursive: true });
  }

  const targetFile = path.join(componentsDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(ui.errorBlock(`Already exists: src/components/${pascalCase}.tsx`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  const islandTemplate = `import { useState } from "react";

/**
 * ⚡ ForgeWP Selective Hydration Island Component — "${pascalCase}"
 *
 * NOTE: ForgeWP automatically detects that this component is interactive (using React hooks/state)
 * and wraps it in a \`<Hydrate>\` wrapper during theme compilation with the default 'visible' trigger.
 *
 * You do NOT need to manually wrap it unless you want to customize the trigger
 * (e.g., to load on 'click', 'hover', 'interaction', or 'idle').
 *
 * Example of custom trigger overrides:
 * import ${pascalCase} from "@/components/${pascalCase}";
 * import { Hydrate } from "@forgewp/react";
 *
 * <Hydrate trigger="click">
 *   <${pascalCase} />
 * </Hydrate>
 */
export interface ${pascalCase}Props {}

export default function ${pascalCase}(_props: ${pascalCase}Props) {
  const [value, setValue] = useState(0);

  return (
    <div>
      <span>{value}</span>
      <button onClick={() => setValue((v) => v + 1)}>Update</button>
    </div>
  );
}
`;

  const { writtenPath } = writeScaffoldFile(themeRoot, targetFile, islandTemplate);

  console.log(`\n${ui.created('island', pascalCase, path.relative(themeRoot, writtenPath).replaceAll('\\', '/'))}`);
  console.log(ui.detail('ForgeWP detects and hydrates it automatically on export.'));
  console.log(`${ui.tip(`Change when it hydrates: ${ui.command(`<Hydrate trigger="click"><${pascalCase} /></Hydrate>`)}`)}\n`);
}

export function onMakePage(themeRoot, { pascalCase, pc }) {
  const pagesDir = path.join(themeRoot, 'src', 'app', 'pages');
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
  }

  const targetFile = path.join(pagesDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(ui.errorBlock(`Already exists: src/app/pages/${pascalCase}.tsx`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  const pageTemplate = `import { WpHead, useWpTitle, useWpExcerpt } from "@forgewp/react";

export const pageConfig = { layout: "default" };

/**
 * ⚡ ForgeWP Custom Page Template — "${pascalCase}"
 * 
 * This file compiles into a standalone WordPress Custom Page Template.
 * You can select it in the WordPress page editor dropdown as "Template: ${pascalCase}".
 */
export function ${pascalCase}() {
  return (
    <main className="container mx-auto px-6 py-12 font-sans text-slate-900">
      <WpHead 
        title="${pascalCase}" 
        description="Dynamic WordPress Custom Page Template ${pascalCase} compiled with ForgeWP." 
      />

      {/* Hero Header Area */}
      <header className="border-b border-slate-100 pb-6 mb-12">
        <span className="inline-block bg-primary/5 text-primary border border-primary/10 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 mb-4">
          Page Template
        </span>
        <h1 className="text-5xl font-black tracking-tight uppercase text-slate-900">
          {useWpTitle() || "${pascalCase}"}
        </h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          {useWpExcerpt() || "Custom page layout designed dynamically."}
        </p>
      </header>

      {/* Page Content layout */}
      <div className="bg-white border border-slate-100 p-8 shadow-lg max-w-none prose prose-slate">
        <p className="text-slate-600 leading-relaxed">
          Welcome to your new custom page template! You can design anything here in React, using standard HTML/JSX tags and Tailwind classes.
        </p>
      </div>
    </main>
  );
}
`;

  const { writtenPath } = writeScaffoldFile(themeRoot, targetFile, pageTemplate);

  console.log(`\n${ui.created('page template', pascalCase, path.relative(themeRoot, writtenPath).replaceAll('\\', '/'))}`);
  console.log(ui.detail(`Appears in WordPress as the "${pascalCase}" page template.`));
  console.log(`${ui.hint('Next', `add a route for it in ${ui.command('src/app/routes.tsx')} ${ui.c.dim('to preview it locally')}`)}\n`);
}

export function onMakeForm(
  themeRoot,
  { slug, pascalCase, fields, mailTo, pc },
) {
  const formsDir = path.join(themeRoot, 'cms', 'forms');
  if (!existsSync(formsDir)) {
    mkdirSync(formsDir, { recursive: true });
  }
  const formConfigFile = path.join(formsDir, `${slug}.ts`);
  if (existsSync(formConfigFile)) {
    console.error(ui.errorBlock(`Already exists: cms/forms/${slug}.ts`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  const componentsDir = path.join(themeRoot, 'src', 'components', 'forms');
  if (!existsSync(componentsDir)) {
    mkdirSync(componentsDir, { recursive: true });
  }
  const componentName = `${pascalCase}Form`;
  const componentFile = path.join(componentsDir, `${componentName}.tsx`);
  if (existsSync(componentFile)) {
    console.error(ui.errorBlock(`Already exists: src/components/forms/${componentName}.tsx`, 'Choose a different name, or remove the existing file first.'));
    process.exit(1);
  }

  const toLabel = (name) =>
    name
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  // ── cms/forms/{slug}.ts ──────────────────────────────────────────────
  const fieldsConfigPhp = fields
    .map(({ name, type }) => {
      const label = toLabel(name);
      if (type === 'select') {
        return `    ${name}: { type: 'select', label: '${label}', required: true, options: ['Option 1', 'Option 2'] },`;
      }
      return `    ${name}: { type: '${type}', label: '${label}', required: true },`;
    })
    .join('\n');

  const formConfigTemplate = `/**
 * ${toLabel(slug)} form — server-side contract for submitWpForm('${slug}', ...).
 *
 * Source of truth for:
 *  - REST endpoint (/forgewp/v1/forms/${slug}/submit)
 *  - mail delivery + optional submission storage (wp-admin > Forms Submissions)
 *
 * Discovered automatically from this file — nothing else needs to reference
 * it. See ${componentName}.tsx (src/components/forms/) for the matching UI.
 *
 * Want client-editable fields (added/removed later in wp-admin, without a
 * redeploy)? Add a \`clientFields\` key here and render it with
 * <WpFormFields form="${slug}" render={...} /> — see forgewp_forms_spec.md.
 */
import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: '${mailTo}',
  subject: 'New ${toLabel(slug)} submission',
  fields: {
${fieldsConfigPhp}
  },
  storeSubmissions: true,
});
`;

  const { writtenPath: formConfigWritten } = writeScaffoldFile(themeRoot, formConfigFile, formConfigTemplate);

  // ── src/components/forms/{Name}Form.tsx ─────────────────────────────
  const inputClassName =
    'w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all';

  const fieldMarkup = fields
    .map(({ name, type }) => {
      const label = toLabel(name);
      let control;
      if (type === 'textarea') {
        control = `<textarea
          name="${name}"
          required
          rows={5}
          className="${inputClassName} resize-none"
        />`;
      } else if (type === 'select') {
        control = `<select name="${name}" required className="${inputClassName} bg-white">
          <option value="">Please choose…</option>
          <option value="Option 1">Option 1</option>
          <option value="Option 2">Option 2</option>
        </select>`;
      } else if (type === 'checkbox') {
        control = `<input type="checkbox" name="${name}" required />`;
      } else {
        control = `<input
          type="${type}"
          name="${name}"
          required
          className="${inputClassName}"
        />`;
      }
      return `        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            ${label}
          </label>
          ${control}
        </div>`;
    })
    .join('\n');

  const componentTemplate = `import * as React from "react";
import { submitWpForm } from "@forgewp/react";

/**
 * ⚡ ForgeWP Form — "${componentName}"
 *
 * Submits to the "${slug}" form declared in cms/forms/${slug}.ts. ForgeWP
 * auto-detects this component as interactive (uses React state) and
 * hydrates it in the browser so onSubmit fires instead of a native form
 * GET submit.
 */
export default function ${componentName}() {
  const [status, setStatus] = React.useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const result = await submitWpForm("${slug}", new FormData(e.currentTarget));

    if (result.ok) {
      setStatus("success");
      e.currentTarget.reset();
    } else {
      setErrorMsg(result.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Thanks — message sent!</h2>
        <p className="text-slate-500 text-sm">We'll get back to you soon.</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 bg-primary text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl cursor-pointer hover:bg-primary/90 transition-all"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl shadow-xs p-8 space-y-5">
${fieldMarkup}

      {status === "error" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-3">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer"
      >
        {status === "sending" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
`;

  const { writtenPath: componentWritten } = writeScaffoldFile(themeRoot, componentFile, componentTemplate);

  const rel = (file) => path.relative(themeRoot, file).replaceAll('\\', '/');
  console.log(`\n${ui.created('form', slug, rel(componentWritten))}`);
  console.log(ui.detail(`Config  ${rel(formConfigWritten)}`));
  console.log(`${ui.hint('Use', ui.command(`import ${componentName} from "@/components/forms/${componentName}";`))}\n`);
}

export function onSyncRoutes(themeRoot, { routesToScaffold, isForce, pc }) {
  function toPascalCase(str) {
    return (
      str
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('') + 'Page'
    );
  }

  const pagesDir = path.join(themeRoot, 'src', 'app', 'pages');
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
  }

  let scaffoldedCount = 0;
  let skippedCount = 0;

  for (const route of routesToScaffold) {
    const componentName = toPascalCase(route.title);
    const componentPath = path.join(pagesDir, `${componentName}.tsx`);

    const componentContent = `/**
 * ⚡ Auto-Generated Page Component by ForgeWP
 * 
 * This file was generated automatically from your sitemap configuration (cms/menus.json).
 * You can safely edit this file to customize the visual layout, styles, and logic.
 * Subsequent runs of 'pnpm forgewp sync:routes' will NOT overwrite your changes.
 * 
 * To force reset this page back to boilerplate defaults, run:
 * 'pnpm forgewp sync:routes --force'
 * 
 * This file compiles into a standalone WordPress Custom Page Template.
 * You can select it in the WordPress page editor dropdown as "Template: ${componentName}".
 */
import { WpHead, WpQueryLoop, useWpTitle, useWpExcerpt, useWpFeaturedImage } from "@forgewp/react";

export const pageConfig = { layout: "default" };

export function ${componentName}() {
  return (
    <main className="container mx-auto px-6 py-12 font-sans text-slate-900">
      {/* WordPress SEO — compiles to native <meta> tags in your theme header */}
      <WpHead 
        title="${route.title}" 
        description="Explore our exclusive ${route.title} section, dynamically loaded in Headless React." 
      />

      {/* Hero Header Area */}
      <header className="border-b border-slate-100 pb-6 mb-12">
        <h1 className="text-5xl font-black tracking-tight uppercase text-slate-900">${route.title}</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Auto-generated template. Edit <code className="bg-slate-50 px-1 py-0.5 border border-slate-100 text-xs text-primary font-mono">src/app/pages/${componentName}.tsx</code> to customize this page.
        </p>
      </header>

      {/* Grid Starter - WordPress Mock Loop */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <WpQueryLoop postType="post" postsPerPage={3}>
          <article className="border border-slate-100 p-6 bg-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-none flex flex-col justify-between">
            <div>
              <div className="w-full h-48 bg-slate-50/50 mb-4 border border-slate-100 overflow-hidden">
                <img 
                  src={useWpFeaturedImage()} 
                  alt={useWpTitle()} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight mb-2 text-slate-900">
                {useWpTitle()}
              </h2>
              <p className="text-slate-500 text-sm mb-4">
                {useWpExcerpt()}
              </p>
            </div>
            <a 
              href="#" 
              className="inline-block px-4 py-2 border border-primary bg-primary text-white font-bold uppercase text-[10px] tracking-wider hover:bg-transparent hover:text-primary transition-colors cursor-pointer text-center"
            >
              Read More
            </a>
          </article>
        </WpQueryLoop>
      </section>
    </main>
  );
}
`;

    if (existsSync(componentPath) && !isForce) {
      console.log(
        ui.info('Kept existing page', `src/app/pages/${componentName}.tsx`),
      );
      skippedCount++;
    } else {
      writeFileSync(componentPath, componentContent, 'utf8');
      console.log(
        ui.done('Created page', `src/app/pages/${componentName}.tsx`),
      );
      scaffoldedCount++;
    }
  }

  // Discover Custom Post Types from cms/mock-data.ts (preferred) plus leftover cms/*.json
  const cmsDir = path.join(themeRoot, 'cms');
  let cpts = [];
  const skipCptKeys = new Set([
    'post',
    'posts',
    'page',
    'pages',
    'menu',
    'menus',
    'primary',
    'utility',
    'attachment',
  ]);
  const ingestCptMap = (fileContent) => {
    if (
      !fileContent ||
      typeof fileContent !== 'object' ||
      Array.isArray(fileContent)
    )
      return;
    for (const [key, value] of Object.entries(fileContent)) {
      if (
        Array.isArray(value) &&
        !key.startsWith('_') &&
        !skipCptKeys.has(key) &&
        !cpts.includes(key)
      ) {
        cpts.push(key);
      }
    }
  };
  try {
    ingestCptMap(loadMockData(themeRoot));
    if (existsSync(cmsDir)) {
      const skipJson = new Set([
        'menus.json',
        'users.json',
        'roles.json',
        'sessions.json',
        'translations.json',
        'mock-data.json',
      ]);
      const jsonFiles = readdirSync(cmsDir).filter(
        (f) => f.endsWith('.json') && !skipJson.has(f),
      );
      for (const f of jsonFiles) {
        try {
          ingestCptMap(JSON.parse(readFileSync(path.join(cmsDir, f), 'utf8')));
        } catch {}
      }
    }
  } catch (e) {
    console.log(ui.warn('Could not read cms/ to find custom post types'));
  }

  let cptScaffoldedCount = 0;
  let cptSkippedCount = 0;

  for (const cpt of cpts) {
    const pascalCpt = cpt.charAt(0).toUpperCase() + cpt.slice(1);

    // 1. Scaffold thin wrapper src/app/single-${cpt}.tsx
    const wrapperPath = path.join(themeRoot, 'src', 'app', `single-${cpt}.tsx`);
    const wrapperContent = `import { Single${pascalCpt}Page } from "./pages/Single${pascalCpt}Page";
export default Single${pascalCpt}Page;
`;

    if (existsSync(wrapperPath) && !isForce) {
      // Skip wrapper
    } else {
      writeFileSync(wrapperPath, wrapperContent, 'utf8');
      console.log(
        ui.done('Created post-type template', `src/app/single-${cpt}.tsx`),
      );
    }

    // 2. Scaffold page component src/app/pages/Single${pascalCpt}Page.tsx
    const cptPagePath = path.join(pagesDir, `Single${pascalCpt}Page.tsx`);
    const cptPageContent = `/**
 * ⚡ Auto-Generated CPT Single Page Component by ForgeWP
 * 
 * This file was generated automatically for the custom post type "${cpt}".
 * You can safely edit this file to customize the visual layout, styles, and custom fields.
 * Subsequent runs of 'pnpm forgewp sync:routes' will NOT overwrite your changes.
 * 
 * To force reset this page back to boilerplate defaults, run:
 * 'pnpm forgewp sync:routes --force'
 */
import { 
  useRoute,
  WpHead, 
  WpLink, 
  useWpQuery, 
  useWpTitle, 
  useWpContent, 
  useWpFeaturedImage 
} from "@forgewp/react";
import { ArrowLeft } from "lucide-react";

export function Single${pascalCpt}Page() {
  const [, params] = useRoute("/${cpt}/:id");
  const routeParam = params?.id;

  // In production, forgeWpHydration.post.id holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? window.forgeWpHydration?.post?.id || 0
      : 0;
  const id = hydrationId || routeParam;

  // Local development mock query for single ${cpt}
  const { posts } = useWpQuery({
    postType: "${cpt}",
    postsPerPage: 100,
  });

  const devPost = posts.find(
    (p) => p.id === Number(id) || p.id === Number(hydrationId)
  );

  // Isomorphic dynamic mapping (compiles directly to WP loops in production)
  const title = useWpTitle() || devPost?.title || "Details";
  const content =
    useWpContent() || devPost?.content || "<p>Loading details...</p>";
  const rawImage = useWpFeaturedImage();
  const hydrationImage =
    typeof window !== 'undefined' && !window._forgeWpCompileTime
      ? window.forgeWpHydration?.currentFeaturedImage || ""
      : "";
  const restImage =
    typeof devPost?.featuredImage === "object" && devPost?.featuredImage !== null
      ? (devPost.featuredImage as any).url || ""
      : String(devPost?.featuredImage || "");
  const featuredImage = restImage || hydrationImage || rawImage || "https://picsum.photos/seed/forgewp/1200/630";

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <WpHead 
        title={title} 
        description="Dynamic single CPT details, loaded dynamically inside Headless React." 
      />

      <div className="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl p-8 sm:p-12">
        {/* Back Button */}
        <WpLink 
          href="/${cpt}s" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to overview
        </WpLink>

        {/* Hero image */}
        {featuredImage && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-100 mb-8">
            <img 
              src={featuredImage} 
              alt={title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 uppercase mb-6 leading-tight">
          {title}
        </h1>

        {/* Content */}
        <div 
          className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </main>
  );
}
`;

    if (existsSync(cptPagePath) && !isForce) {
      console.log(
        ui.info('Kept existing post-type page', `src/app/pages/Single${pascalCpt}Page.tsx`),
      );
      cptSkippedCount++;
    } else {
      writeFileSync(cptPagePath, cptPageContent, 'utf8');
      console.log(
        ui.done('Created post-type page', `src/app/pages/Single${pascalCpt}Page.tsx`),
      );
      cptScaffoldedCount++;
    }
  }

  const routesFilePath = path.join(themeRoot, 'src', 'app', 'routes.tsx');
  if (existsSync(routesFilePath)) {
    let routesContent = readFileSync(routesFilePath, 'utf8');
    let modified = false;

    for (const route of routesToScaffold) {
      const componentName = toPascalCase(route.title);

      const importRegex = new RegExp(
        `import\\s+\\{\\s*${componentName}\\s*\\}\\s+from\\s+["']\\./pages/${componentName}["']`,
      );
      if (!importRegex.test(routesContent)) {
        const defaultExportIndex = routesContent.indexOf(
          'export default function',
        );
        if (defaultExportIndex !== -1) {
          routesContent =
            routesContent.slice(0, defaultExportIndex) +
            `import { ${componentName} } from "./pages/${componentName}";\n` +
            routesContent.slice(defaultExportIndex);
          modified = true;
        }
      }

      const routeRegex = new RegExp(`path\\s*=\\s*["']${route.path}["']`);
      if (!routeRegex.test(routesContent)) {
        const hasWithLayout = routesContent.includes('withLayout');
        const compTarget = hasWithLayout
          ? `withLayout(${componentName})`
          : componentName;

        const fallbackMarker = '{/* Fallback route */}';
        const fallbackIndex = routesContent.indexOf(fallbackMarker);
        if (fallbackIndex !== -1) {
          routesContent =
            routesContent.slice(0, fallbackIndex) +
            `<Route path="${route.path}" component={${compTarget}} />\n\n      ` +
            routesContent.slice(fallbackIndex);
          modified = true;
        } else {
          const switchCloseIndex = routesContent.indexOf('</Switch>');
          if (switchCloseIndex !== -1) {
            routesContent =
              routesContent.slice(0, switchCloseIndex) +
              `  <Route path="${route.path}" component={${compTarget}} />\n      ` +
              routesContent.slice(switchCloseIndex);
            modified = true;
          }
        }
      }
    }

    // --- CPT Routing Sync ---
    for (const cpt of cpts) {
      const pascalCpt = cpt.charAt(0).toUpperCase() + cpt.slice(1);
      const componentName = `Single${pascalCpt}Page`;

      const importRegex = new RegExp(
        `import\\s+\\{\\s*${componentName}\\s*\\}\\s+from\\s+["']\\./pages/${componentName}["']`,
      );
      if (!importRegex.test(routesContent)) {
        const defaultExportIndex = routesContent.indexOf(
          'export default function',
        );
        if (defaultExportIndex !== -1) {
          routesContent =
            routesContent.slice(0, defaultExportIndex) +
            `import { ${componentName} } from "./pages/${componentName}";\n` +
            routesContent.slice(defaultExportIndex);
          modified = true;
        }
      }

      const routeRegex = new RegExp(`path\\s*=\\s*["']/${cpt}/:id["']`);
      if (!routeRegex.test(routesContent)) {
        const hasWithLayout = routesContent.includes('withLayout');
        const compTarget = hasWithLayout
          ? `withLayout(${componentName})`
          : componentName;

        const fallbackMarker = '{/* Fallback route */}';
        const fallbackIndex = routesContent.indexOf(fallbackMarker);
        if (fallbackIndex !== -1) {
          routesContent =
            routesContent.slice(0, fallbackIndex) +
            `<Route path="/${cpt}/:id" component={${compTarget}} />\n\n      ` +
            routesContent.slice(fallbackIndex);
          modified = true;
        } else {
          const switchCloseIndex = routesContent.indexOf('</Switch>');
          if (switchCloseIndex !== -1) {
            routesContent =
              routesContent.slice(0, switchCloseIndex) +
              `  <Route path="/${cpt}/:id" component={${compTarget}} />\n      ` +
              routesContent.slice(switchCloseIndex);
            modified = true;
          }
        }
      }
    }

    if (modified) {
      writeFileSync(routesFilePath, routesContent, 'utf8');
      console.log(ui.done('Linked new pages', 'src/app/routes.tsx'));
    } else {
      console.log(ui.info('Routes already up to date', 'src/app/routes.tsx'));
    }
  } else {
    console.log(ui.warn('src/app/routes.tsx not found', 'pages were created but not linked'));
  }

  const kept = skippedCount + cptSkippedCount;
  console.log('');
  console.log(
    `  ${ui.c.green(ui.symbols.done)} ${ui.c.bold(`Created ${scaffoldedCount} page${scaffoldedCount === 1 ? '' : 's'} and ${cptScaffoldedCount} post-type template${cptScaffoldedCount === 1 ? '' : 's'}`)}${kept ? `  ${ui.c.dim(`${kept} existing kept`)}` : ''}\n`,
  );
}

export { scanForHydrationIslands, findComponentPath, getHydrationRollupInputs };
export { buildAssets, readBuildManifest as readBuildAssets } from './build-assets.js';
export { packageAssets } from './vite-export-assets.js';
