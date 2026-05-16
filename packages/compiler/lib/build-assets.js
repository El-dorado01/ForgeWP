import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * @param {string} themeRoot
 * @param {{ packageManager?: string }} [options]
 * @returns {import('./types.js').ForgeWPBuildAssets}
 */
export function buildAssets(themeRoot, options = {}) {
  const pm = options.packageManager ?? detectPackageManager();
  const build = runPackageScript(themeRoot, pm, "build");

  if (build.status !== 0) {
    throw new Error("Vite build failed. Fix build errors and run export again.");
  }

  return readBuildManifest(themeRoot);
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm/")) return "pnpm";
  if (ua.startsWith("yarn/")) return "yarn";
  if (ua.startsWith("bun/")) return "bun";
  return "npm";
}

function runPackageScript(cwd, pm, script) {
  const env = { ...process.env, INIT_CWD: cwd };

  switch (pm) {
    case "pnpm":
      return spawnSync("pnpm", ["run", script], {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
        env,
      });
    case "yarn":
      return spawnSync("yarn", ["run", script], {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
        env,
      });
    case "bun":
      return spawnSync("bun", ["run", script], {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
        env,
      });
    default:
      return spawnSync("npm", ["run", script], {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
        env,
      });
  }
}

/**
 * @param {string} themeRoot
 * @returns {import('./types.js').ForgeWPBuildAssets}
 */
export function readBuildManifest(themeRoot) {
  const candidates = [
    path.join(themeRoot, "dist", ".vite", "manifest.json"),
    path.join(themeRoot, "dist", "manifest.json"),
  ];

  const manifestPath = candidates.find((candidate) => existsSync(candidate));

  if (!manifestPath) {
    throw new Error(
      "Build manifest not found. Enable build.manifest in vite.config.ts and run build first.",
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry =
    manifest["index.html"] ??
    Object.values(manifest).find((chunk) => chunk?.isEntry);

  if (!entry?.file) {
    throw new Error("Could not find entry chunk in Vite manifest");
  }

  const cssFile = entry.css?.[0];
  if (!cssFile) {
    throw new Error("No CSS file in Vite build output");
  }

  return {
    cssFile,
    jsFile: entry.file,
  };
}
