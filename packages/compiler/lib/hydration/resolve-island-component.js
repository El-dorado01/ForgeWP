/**
 * Pick the React component export that matches a hydration island name.
 *
 * Never fall back to `Object.values(module)[0]` — Vite's export object
 * order is not the component the island was named for. A multi-export
 * module would otherwise mount a sibling export with the wrong props.
 *
 * @param {Record<string, unknown>} module
 * @param {string} islandName kebab-case island id (e.g. "product-hotspot")
 * @returns {Function|undefined}
 */
export function resolveIslandComponent(module, islandName) {
  if (!module || !islandName) return undefined;

  const pascalName = islandName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  if (typeof module[pascalName] === "function") return module[pascalName];
  if (typeof module.default === "function") return module.default;

  const fnKeys = Object.keys(module).filter(
    (k) => k !== "default" && typeof module[k] === "function",
  );
  if (fnKeys.length === 1) return module[fnKeys[0]];

  return undefined;
}

/**
 * Browser-hydrator copy of resolveIslandComponent (no ESM import in the
 * generated IIFE). Keep in sync with the function above.
 */
export const RESOLVE_ISLAND_COMPONENT_JS = `
        const pascalName = islandName
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("");
        let Component = typeof module[pascalName] === "function" ? module[pascalName] : undefined;
        if (!Component && typeof module.default === "function") {
          Component = module.default;
        }
        if (!Component) {
          const fnKeys = Object.keys(module).filter(function (k) {
            return k !== "default" && typeof module[k] === "function";
          });
          if (fnKeys.length === 1) {
            Component = module[fnKeys[0]];
          }
        }
`;
