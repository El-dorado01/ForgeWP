import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";

/**
 * @param {string} themeRoot
 * @returns {Promise<import('./types.js').ForgeWPThemeConfig>}
 */
export async function loadConfig(themeRoot) {
  const configPath = path.join(themeRoot, "wp.config.ts");

  if (!existsSync(configPath)) {
    throw new Error(`Missing wp.config.ts in ${themeRoot}`);
  }

  const jiti = createJiti(pathToFileURL(configPath).href, {
    interopDefault: true,
  });

  const config = await jiti.import(configPath);

  if (!config?.slug || !config?.name) {
    throw new Error("wp.config.ts must export name, slug, version, description, textDomain");
  }

  return config;
}
