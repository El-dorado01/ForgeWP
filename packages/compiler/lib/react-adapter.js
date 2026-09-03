import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Server-render the theme App to static HTML.
 * @param {string} themeRoot
 */
export async function renderStaticMarkup(themeRoot) {
  const renderScript = path.join(__dirname, 'render-theme.mts');
  const tsconfig = path.join(themeRoot, 'tsconfig.json');

  let tsxCli = 'tsx';
  try {
    tsxCli = require.resolve('tsx/cli');
  } catch {
    // fallback to PATH
  }

  const args = [tsxCli];
  if (existsSync(tsconfig)) {
    args.push('--tsconfig', tsconfig);
  }
  args.push(renderScript, themeRoot);

  const result = spawnSync(process.execPath, args, {
    cwd: themeRoot,
    env: {
      ...process.env,
      INIT_CWD: themeRoot,
    },
    encoding: 'utf8',
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
        if (typeof Component !== "function") {
          const exportsList = Object.keys(module).join(", ");
          console.error(
            "[ForgeWP Hydrator] Chunk for " + islandName + " does not export a valid React component. " +
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

  function resolveExport(module, islandName) {
    if (!module || typeof module !== "object") return undefined;
    const pascalName = islandName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);

    if (typeof module[pascalName] === "function") return module[pascalName];
    if (typeof module[camelName] === "function") return module[camelName];
    if (typeof module.default === "function") return module.default;

    const keys = Object.keys(module);
    for (let i = 0; i < keys.length; i++) {
      const val = module[keys[i]];
      if (typeof val === "function") {
        if (val.displayName === pascalName || val.name === pascalName) return val;
        if (val.displayName === camelName || val.name === camelName) return val;
      }
    }

    const cleanIsland = islandName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.toLowerCase() === cleanIsland && typeof module[k] === "function") {
        return module[k];
      }
    }

    const fnKeys = keys.filter(function (k) {
      return typeof module[k] === "function";
    });
    if (fnKeys.length === 1) return module[fnKeys[0]];

    const nonHooks = fnKeys.filter(function (k) {
      const fn = module[k];
      const fnName = fn.displayName || fn.name || k;
      return !/^use[A-Z]/.test(fnName);
    });
    if (nonHooks.length === 1) return module[nonHooks[0]];

    if (islandName.endsWith("-provider") || islandName.includes("provider")) {
      const provMatch = fnKeys.find(function (k) {
        const fnName = module[k].displayName || module[k].name || k;
        return /Provider$/i.test(fnName);
      });
      if (provMatch) return module[provMatch];
    }

    if (nonHooks.length > 0) return module[nonHooks[0]];
    if (fnKeys.length > 0) return module[fnKeys[0]];
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
      return list.filter(function (fn) { return typeof fn === "function"; });
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
  return ['src/main.tsx'];
}

export async function onFresh(themeRoot) {
  const routesPath = path.join(themeRoot, 'src', 'app', 'routes.tsx');
  const pagePath = path.join(themeRoot, 'src', 'app', 'page.tsx');

  const routesContent = `import type { ComponentType, ReactNode } from "react";
import { Route, Switch } from "@forgewp/react";
import * as HomePage from "./page";
import * as QuerySandbox from "./query-sandbox";
import * as WpEditablePage from "./wp-editable";

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

      {/* Relational Query Engine Sandbox — verifies taxQuery, metaQuery, pagination */}
      <Route path="/query-sandbox" component={withLayout(QuerySandbox)} />

      {/* WpEditable Block Canvas Preview — verifies inline editing primitive */}
      <Route path="/wp-editable" component={withLayout(WpEditablePage)} />

      {/* Fallback route */}
      <Route>
        {withLayout(() => (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
            <h1 className="text-4xl font-bold font-serif text-zinc-950">404</h1>
            <p className="mt-2 text-zinc-600">Page not found locally.</p>
            <div className="mt-4 flex flex-col items-center gap-2 text-sm">
              <a href="/" className="text-brand font-semibold hover:underline">← Go back home</a>
              <a href="/query-sandbox" className="text-zinc-500 font-mono hover:underline text-xs">→ Query Engine Sandbox</a>
              <a href="/wp-editable" className="text-zinc-500 font-mono hover:underline text-xs">→ WpEditable Canvas</a>
            </div>
          </div>
        ))()}
      </Route>
    </Switch>
  );
}
`;

  const pageContent = `import { WpHead } from "../.forgewp/wordpress";
import { BookOpen, Github, ChevronRight, Database, Code2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#fafafa] selection:bg-primary selection:text-white flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 relative overflow-x-hidden lg:overflow-hidden font-sans">
      <WpHead
        title="ForgeWP — React & Tailwind Compiler for WordPress"
        description="A premium developer framework for creating modern Gutenberg block-themes using React."
        ogType="website"
      />

      {/* ── BACKGROUND: Glowing Magma Blob ── */}
      <div className="absolute -left-48 -top-48 w-[600px] h-[600px] bg-[radial-gradient(circle,oklch(0.61_0.22_42.5/_0.12)_0%,transparent_70%)] blur-3xl pointer-events-none z-0"></div>

      {/* ── HEADER: Centered Text Logo ── */}
      <header className="relative w-full flex justify-center pb-4 lg:pb-6 z-10 shrink-0">
        <h1 className="font-heading font-black text-3xl tracking-tight bg-linear-to-r from-primary to-amber-500 bg-clip-text text-transparent select-none">
          ForgeWP
        </h1>
      </header>

      {/* ── COMPACT CARD CONTAINER wrapping the Two-Column Grid ── */}
      <main className="relative w-full max-w-5xl bg-white border border-slate-100/80 shadow-xl shadow-slate-100/50 p-6 md:p-8 lg:py-8 lg:px-10 lg:min-h-[430px] z-10 rounded-none flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 w-full items-center">
          
          {/* Left Layout: Hero Header, Text, and Two CTAs */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tight leading-[1.1] text-slate-900 mb-4 uppercase">
              React Structure.
              <br />
              Tailwind Speed.
              <br />
              WordPress Power.
            </h2>

            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-normal max-w-xl mb-6">
              Welcome to ForgeWP. Build your layout dynamically using standard
              React components, mock hooks, and modern utilities. The compiler
              transpiles your isomorphic components directly into
              production-grade, standard classic WordPress block themes
              automatically.
            </p>

            {/* Two CTAs: Docs and GitHub */}
            <div className="flex flex-wrap gap-4">
              <a
                href="https://forgewp.dev/docs"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-center justify-center bg-transparent text-primary hover:text-white border border-primary font-mono font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 transition-colors duration-500 rounded-none overflow-hidden select-none cursor-pointer shadow-sm shadow-primary/5 hover:shadow-md hover:shadow-primary/10"
              >
                {/* Fill effect helper layer */}
                <div className="absolute inset-y-0 left-0 bg-primary w-0 group-hover:w-full transition-all duration-600 ease-out z-0"></div>
                
                {/* Text Content */}
                <span className="relative z-10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 mr-2" />
                  Read Framework Docs
                </span>
              </a>
              <a
                href="https://github.com/forgewp/forgewp"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 font-mono font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 rounded-none select-none cursor-pointer"
              >
                <Github className="w-3.5 h-3.5 mr-2" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Right Layout: Two Stacked Compact Cards */}
          <div className="lg:col-span-6 flex flex-col gap-4 w-full">

            {/* Card 1: Query Sandbox */}
            <a
              href="/query-sandbox"
              className="group bg-white border border-transparent p-4 lg:p-5 shadow-md shadow-slate-100/30 hover:shadow-[0_0_15px_oklch(0.61_0.22_42.5/_0.08)] transition-all duration-500 rounded-none relative overflow-hidden flex flex-col justify-center"
            >
              {/* Top border progress bar on hover */}
              <div className="absolute top-0 left-0 h-[2px] bg-linear-to-r from-primary to-amber-500 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>

              <div className="flex items-start gap-4">
                <div className="bg-amber-500/5 p-2.5 rounded-full border border-amber-500/10 shrink-0">
                  <Database className="w-5 h-5 text-amber-500" />
                </div>
                
                <div className="flex-1 pr-6">
                  <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight mb-2 uppercase">
                    Relational Query Sandbox
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                    Test and inspect ForgeWP's mock data loop systems, custom tax
                    queries, meta mappings, and server pagination.
                  </p>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <ChevronRight className="w-5 h-5 text-amber-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500" />
                </div>
              </div>
            </a>

            {/* Card 2: wp-editable */}
            <a
              href="/wp-editable"
              className="group bg-white border border-transparent p-4 lg:p-5 shadow-md shadow-slate-100/30 hover:shadow-[0_0_15px_oklch(0.61_0.22_42.5/_0.08)] transition-all duration-500 rounded-none relative overflow-hidden flex flex-col justify-center"
            >
              {/* Top border progress bar on hover */}
              <div className="absolute top-0 left-0 h-[2px] bg-linear-to-r from-primary to-amber-500 w-0 group-hover:w-full transition-all duration-1000 ease-out"></div>

              <div className="flex items-start gap-4">
                <div className="bg-primary/5 p-2.5 rounded-full border border-primary/10 shrink-0">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 pr-6">
                  <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight mb-2 uppercase">
                    WpEditable Block Canvas
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans font-medium">
                    Test visual inline editing primitives. Build custom content
                    editors directly inside the Gutenberg admin dashboard.
                  </p>
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <ChevronRight className="w-5 h-5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500" />
                </div>
              </div>
            </a>

          </div>
        </div>
      </main>
    </div>
  );
}
`;

  try {
    writeFileSync(routesPath, routesContent, 'utf8');
    console.log(
      `  ${pc.green('✅ Reset routes definition')}: src/app/routes.tsx`,
    );
  } catch (err) {
    console.log(
      pc.red(`  ❌ Failed to reset src/app/routes.tsx: ${err.message}`),
    );
  }

  try {
    writeFileSync(pagePath, pageContent, 'utf8');
    console.log(`  ${pc.green('✅ Reset core template')}: src/app/page.tsx`);
  } catch (err) {
    console.log(
      pc.red(`  ❌ Failed to reset src/app/page.tsx: ${err.message}`),
    );
  }

  // Ensure shadcn's components.json is present so `forgewp add` works
  // immediately after a fresh without requiring a manual `shadcn init`.
  const componentsJsonPath = path.join(themeRoot, 'components.json');
  if (!existsSync(componentsJsonPath)) {
    const defaultComponentsJson = {
      $schema: 'https://ui.shadcn.com/schema.json',
      style: 'new-york',
      rsc: false,
      tsx: true,
      tailwind: {
        config: 'tailwind.config.js',
        css: 'src/app/globals.css',
        baseColor: 'zinc',
        cssVariables: true,
        prefix: '',
      },
      aliases: {
        components: '@/components',
        utils: '@/lib/utils',
        ui: '@/components/ui',
        lib: '@/lib',
        hooks: '@/hooks',
      },
      iconLibrary: 'lucide',
    };
    try {
      writeFileSync(
        componentsJsonPath,
        JSON.stringify(defaultComponentsJson, null, 2),
        'utf8',
      );
      console.log(`  ${pc.green('✅ Created shadcn config')}: components.json`);
    } catch (err) {
      console.log(
        pc.yellow(`  ⚠️  Could not create components.json: ${err.message}`),
      );
    }
  } else {
    console.log(`  ${pc.dim('↳ components.json already present')}`);
  }
}

export function onMakeBlock(
  themeRoot,
  { pascalCase, readableTitle, attributesList, pc },
) {
  const blocksDir = path.join(themeRoot, 'src', 'blocks');
  if (!existsSync(blocksDir)) {
    mkdirSync(blocksDir, { recursive: true });
  }

  const targetFile = path.join(blocksDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(
      pc.red(
        `\n❌ Error: Block "${pascalCase}.tsx" already exists at src/blocks/\n`,
      ),
    );
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
 * HOW TO PREVIEW LOCALLY INSIDE REACT:
 * This block is defined using standard React structures. You can import this block and
 * preview its visitor/frontend layout locally in any React page or component without running
 * WordPress, by invoking its `.save()` component with mock attributes:
 * 
 * \`\`\`tsx
 * import ${pascalCase} from "@/blocks/${pascalCase}";
 * 
 * <${pascalCase}.save attributes={{
 *   ${attributesList.map((a, i) => `${a}: "Mock Value ${i + 1}"`).join(',\n   ')}
 * }} />
 * \`\`\`
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

  writeFileSync(targetFile, blockTemplate, 'utf8');

  console.log(
    pc.green(`\n⚡ Modern Block "${pascalCase}" successfully created!`),
  );
  console.log(`   Location: ${pc.cyan(`src/blocks/${pascalCase}.tsx`)}`);
  console.log(`   Gutenberg Title: ${pc.yellow(`Sharp ${readableTitle}`)}`);
  console.log(
    `\n🎉 Run ${pc.cyan('pnpm export')} to automatically register it inside your WordPress theme!\n`,
  );
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
    ? `[\n${allowed.map((s) => `      '${s}',`).join('\n')}\n    ]`
    : 'undefined';
  const templateLit = template.length
    ? `[\n${template
        .map((row) => {
          const name = Array.isArray(row) ? row[0] : row;
          return `      ['${name}'],`;
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

  writeFileSync(targetFile, shellTemplate, 'utf8');

  console.log(log.green(`\n⚡ Parent shell "${pascalCase}" created!`));
  console.log(`   Location: ${log.cyan(`src/blocks/${pascalCase}.tsx`)}`);
  console.log(`   Block name: ${log.yellow(`forgewp/${slug}`)}`);
  if (allowed.length) {
    console.log(`   Children: ${log.cyan(allowed.join(', '))}`);
  } else {
    console.log(
      `   Children: ${log.dim('(none — open shell; any allowed at runtime)')}`,
    );
  }
  console.log(`   Layout: ${log.dim(gridClassName)}`);
  console.log(
    `\n🎉 Run ${log.cyan('pnpm forgewp export')} (or sync-to-wp) to register it in WordPress.\n`,
  );
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
    console.error(
      pc.red(
        `\n❌ Error: Loop "${pascalCase}.tsx" already exists at src/loops/\n`,
      ),
    );
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

  const loopTemplate = `import { WpQueryLoop, useWpTitle, useWpFeaturedImage, useWpExcerpt, useWpPermalink, useWpCustomField } from "@/.forgewp/wordpress";

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

  writeFileSync(targetFile, loopTemplate, 'utf8');

  if (automaticallySeeded) {
    console.log(
      pc.yellow(
        `\n⚠️  Post type "${postType}" was missing from local database (mock-data.json).`,
      ),
    );
    console.log(
      `   We have automatically registered it and seeded default custom fields for you!`,
    );
  }

  console.log(pc.green(`\n⚡ Post Loop "${pascalCase}" successfully created!`));
  console.log(`   Location: ${pc.cyan(`src/loops/${pascalCase}.tsx`)}`);
  console.log(`   Target Post Type: ${pc.yellow(postType)}`);
  if (customFields.length > 0) {
    console.log(
      `   Seeded Custom Fields: ${pc.yellow(customFields.join(', '))}`,
    );
  }
  console.log(`\n🎉 You can now import it directly inside your pages:`);
  console.log(
    `   ${pc.cyan(`import ${pascalCase} from "@/loops/${pascalCase}";`)}\n`,
  );
}

export function onMakeIsland(themeRoot, { pascalCase, pc }) {
  const componentsDir = path.join(themeRoot, 'src', 'components');
  if (!existsSync(componentsDir)) {
    mkdirSync(componentsDir, { recursive: true });
  }

  const targetFile = path.join(componentsDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(
      pc.red(
        `\n❌ Error: Island "${pascalCase}.tsx" already exists at src/components/\n`,
      ),
    );
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

  writeFileSync(targetFile, islandTemplate, 'utf8');

  console.log(
    pc.green(
      `\n⚡ Selective Hydration Island "${pascalCase}" successfully created!`,
    ),
  );
  console.log(`   Location: ${pc.cyan(`src/components/${pascalCase}.tsx`)}`);
  console.log(
    `\n🎉 ForgeWP automatically detects and hydrates this component on compile!`,
  );
  console.log(
    `   If you want to customize the trigger (e.g. hydrate on click):`,
  );
  console.log(`   Wrap it with:`);
  console.log(
    `   ${pc.cyan(`<Hydrate trigger="click">\n     <${pascalCase} />\n   </Hydrate>`)}\n`,
  );
}

export function onMakePage(themeRoot, { pascalCase, pc }) {
  const pagesDir = path.join(themeRoot, 'src', 'app', 'pages');
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
  }

  const targetFile = path.join(pagesDir, `${pascalCase}.tsx`);
  if (existsSync(targetFile)) {
    console.error(
      pc.red(
        `\n❌ Error: Page Template "${pascalCase}.tsx" already exists at src/app/pages/\n`,
      ),
    );
    process.exit(1);
  }

  const pageTemplate = `import { WpHead, useWpTitle, useWpExcerpt } from "../../.forgewp/wordpress";

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

  writeFileSync(targetFile, pageTemplate, 'utf8');

  console.log(
    pc.green(`\n⚡ Custom Page Template "${pascalCase}" successfully created!`),
  );
  console.log(`   Location: ${pc.cyan(`src/app/pages/${pascalCase}.tsx`)}`);
  console.log(`   WordPress Template Name: ${pc.yellow(pascalCase)}`);
  console.log(`\n🎉 To link it in your application routing:`);
  console.log(`   Add it inside your ${pc.cyan('src/app/routes.tsx')} file.\n`);
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
    console.error(
      pc.red(`\n❌ Error: Form "${slug}.ts" already exists at cms/forms/\n`),
    );
    process.exit(1);
  }

  const componentsDir = path.join(themeRoot, 'src', 'components', 'forms');
  if (!existsSync(componentsDir)) {
    mkdirSync(componentsDir, { recursive: true });
  }
  const componentName = `${pascalCase}Form`;
  const componentFile = path.join(componentsDir, `${componentName}.tsx`);
  if (existsSync(componentFile)) {
    console.error(
      pc.red(
        `\n❌ Error: Form component "${componentName}.tsx" already exists at src/components/forms/\n`,
      ),
    );
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

  writeFileSync(formConfigFile, formConfigTemplate, 'utf8');

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
import { submitWpForm } from "../../.forgewp/wordpress";

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

  writeFileSync(componentFile, componentTemplate, 'utf8');

  console.log(pc.green(`\n⚡ Form "${slug}" successfully created!`));
  console.log(`   Config:    ${pc.cyan(`cms/forms/${slug}.ts`)}`);
  console.log(
    `   Component: ${pc.cyan(`src/components/forms/${componentName}.tsx`)}`,
  );
  console.log(`\n🎉 Use it in a page:`);
  console.log(
    `   ${pc.yellow(`import ${componentName} from "@/components/forms/${componentName}";`)}\n`,
  );
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
import { WpHead } from "../../.forgewp/wordpress";
import { WpQueryLoop, useWpTitle, useWpExcerpt, useWpFeaturedImage } from "../../.forgewp/wordpress";

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
        `  ${pc.gray('ℹ️ [Skip] Component already exists:')} src/app/pages/${componentName}.tsx`,
      );
      skippedCount++;
    } else {
      writeFileSync(componentPath, componentContent, 'utf8');
      console.log(
        `  ${pc.green('✅ Scaffolded component')}: src/app/pages/${componentName}.tsx`,
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
    console.log(
      pc.yellow(
        `  ⚠️  Warning: Failed to read cms/ directory for CPT auto-discovery.`,
      ),
    );
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
        `  ${pc.green('✅ Scaffolded thin CPT wrapper')}: src/app/single-${cpt}.tsx`,
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
} from "../../.forgewp/wordpress";
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
        `  ${pc.gray('ℹ️ [Skip] CPT Page Component already exists:')} src/app/pages/Single${pascalCpt}Page.tsx`,
      );
      cptSkippedCount++;
    } else {
      writeFileSync(cptPagePath, cptPageContent, 'utf8');
      console.log(
        `  ${pc.green('✅ Scaffolded CPT Page Component')}: src/app/pages/Single${pascalCpt}Page.tsx`,
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
      console.log(
        `  ${pc.green('✅ Synced routing paths in')}: src/app/routes.tsx`,
      );
    } else {
      console.log(
        `  ${pc.gray('ℹ️  Routes are already fully up to date in')}: src/app/routes.tsx`,
      );
    }
  } else {
    console.log(
      pc.yellow(`  ⚠️  Warning: routes.tsx not found. Skipped route linking.`),
    );
  }

  console.log('\n' + '─'.repeat(60));
  console.log(
    pc.green(
      `\n🎉 ${pc.bold('SITEMAP SYNC COMPLETE:')} Generated ${scaffoldedCount} sitemap pages, ${cptScaffoldedCount} custom post-type templates (skipped ${skippedCount} pages, ${cptSkippedCount} templates).\n`,
    ),
  );
}

export { scanForHydrationIslands, findComponentPath, getHydrationRollupInputs };
